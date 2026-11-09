/* =========================================================
 * 실시간 저장소 (Firebase Firestore) — 무역 탐정단
 * 본 수업 「무역의 발견」과 같은 Firebase 프로젝트를 쓰되 'reviewRooms'라는
 * 따로 된 칸에 저장해서 본 수업 방과 섞이지 않습니다.
 *
 *   reviewRooms/{입장코드}               방: 담당 교사, 단계, 모둠 목록
 *   reviewRooms/{코드}/countries/{모둠}  ans(지금 답) · first(처음 제출한 답 = 점수) · curious(추측·질문)
 *   reviewRooms/{코드}/seats/{모둠}      그 모둠에 들어온 기기
 *   reviewRooms/{코드}/members/{기기}    기기가 고른 모둠 (한 기기 = 한 모둠)
 *
 * 점수는 '처음 제출한 답(first)'으로 화면에서 계산합니다. first는 한 번 저장되면
 * 바꿀 수 없도록 firestore.rules가 막습니다.
 * ========================================================= */
const L = window.TradeLogic;
const fail = (error) => ({ ok: false, error });
const clean = (o) => JSON.parse(JSON.stringify(o));
const ROOMS = 'reviewRooms';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ms = (t) => (t && typeof t.toMillis === 'function') ? t.toMillis() : (typeof t === 'number' ? t : 0);

export const ONLINE_WINDOW = 75 * 1000;
export const HEARTBEAT = 25 * 1000;
export const ROOM_VERSION = 1;
export function roomUsable(r) {
  return !!r && r.ver === ROOM_VERSION && L.STAGES.some((s) => s.n === r.stage);
}
const cdata = (snap) => { const d = snap.data() || {}; return { ans: clean(d.ans || {}), first: clean(d.first || {}), curious: clean(d.curious || {}) }; };
const freshDoc = () => ({ ans: {}, first: {}, curious: {}, op: { kind: 'reset' } });

export function roomRefs(fs, db, code) {
  return {
    room: fs.doc(db, ROOMS, code),
    country: (cid) => fs.doc(db, ROOMS, code, 'countries', cid),
    countries: fs.collection(db, ROOMS, code, 'countries'),
    seat: (cid) => fs.doc(db, ROOMS, code, 'seats', cid),
    seats: fs.collection(db, ROOMS, code, 'seats'),
    member: (uid) => fs.doc(db, ROOMS, code, 'members', uid)
  };
}
export const roomDoc = (fs, db, code) => fs.doc(db, ROOMS, code);

/* ---------- 방 (교사) ---------- */
export async function createRoom(fs, db, uid, cfg) {
  cfg = clean(cfg || L.DEFAULT_CONFIG);
  let code = null;
  for (let i = 0; i < 8 && !code; i++) {
    let c = ''; for (let k = 0; k < 5; k++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const s = await fs.getDoc(fs.doc(db, ROOMS, c));
    if (!s.exists()) code = c;
  }
  if (!code) throw new Error('입장 코드를 만들지 못했어요. 다시 시도해 주세요.');
  const R = roomRefs(fs, db, code);
  await fs.setDoc(R.room, { ver: ROOM_VERSION, ownerUid: uid, createdAt: fs.serverTimestamp(), stage: 1, cfg });
  const b = fs.writeBatch(db);
  cfg.countries.forEach((c) => b.set(R.country(c.id), freshDoc()));
  await b.commit();
  return code;
}
export async function listMyRooms(fs, db, uid) {
  const snap = await fs.getDocs(fs.query(fs.collection(db, ROOMS), fs.where('ownerUid', '==', uid)));
  const out = [];
  snap.forEach((d) => { const r = d.data(); out.push({ code: d.id, stage: r.stage, usable: roomUsable(r), createdAt: ms(r.createdAt) }); });
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
export async function deleteRoom(fs, db, code) {
  const R = roomRefs(fs, db, code);
  const b = fs.writeBatch(db);
  for (const col of ['countries', 'seats', 'members']) {
    const s = await fs.getDocs(fs.collection(db, ROOMS, code, col));
    s.forEach((d) => b.delete(d.ref));
  }
  b.delete(R.room);
  await b.commit();
}

/* ---------- 자리(모둠) 잡기 (학생) ---------- */
export async function joinSeat(fs, db, code, uid, cid) {
  const R = roomRefs(fs, db, code);
  const s = await fs.getDoc(R.seat(cid));
  if (s.exists() && s.data().uid !== uid) return fail('다른 기기가 이미 이 모둠으로 들어와 있어요. 선생님께 말씀해 주세요.');
  const b = fs.writeBatch(db);
  b.set(R.seat(cid), { uid, joinedAt: fs.serverTimestamp(), lastSeen: fs.serverTimestamp() });
  b.set(R.member(uid), { cid });
  try { await b.commit(); } catch (e) {
    if (String(e.code || '').includes('permission')) return fail('다른 기기가 먼저 이 모둠으로 들어왔어요. 다른 모둠을 골라 주세요.');
    throw e;
  }
  return { ok: true };
}
export async function myCountry(fs, db, code, uid) {
  const m = await fs.getDoc(roomRefs(fs, db, code).member(uid));
  return m.exists() ? m.data().cid : null;
}
export function heartbeat(fs, db, code, cid) {
  return fs.updateDoc(roomRefs(fs, db, code).seat(cid), { lastSeen: fs.serverTimestamp() });
}
export async function releaseSeat(fs, db, code, cid) {
  const R = roomRefs(fs, db, code);
  const s = await fs.getDoc(R.seat(cid));
  if (!s.exists()) return { ok: true };
  const b = fs.writeBatch(db);
  b.delete(R.seat(cid)); b.delete(R.member(s.data().uid));
  await b.commit();
  return { ok: true };
}

/* ---------- 실시간 백엔드 ---------- */
export function createRemoteBackend({ fs, db, code, uid, onChange, watchSeats }) {
  const R = roomRefs(fs, db, code);
  let room = null, countries = {}, seats = {}, loaded = { room: false, countries: false };
  let online = typeof navigator === 'undefined' ? true : navigator.onLine, cacheTimer = null, stale = false;
  const unsubs = [];

  function emit() {
    if (!loaded.room) return;
    if (!room) { onChange(null, null, { missing: true }); return; }
    if (!roomUsable(room)) { onChange(null, null, { outdated: true }); return; }
    const cfg = room.cfg;
    const S = { stage: room.stage, countries: {} };
    cfg.countries.forEach((c) => { S.countries[c.id] = countries[c.id] || L.freshCountry(); });
    const ex = { online: online && !stale, ready: loaded.countries };
    if (watchSeats) {
      const now = Date.now(); ex.seats = {};
      cfg.countries.forEach((c) => { const s = seats[c.id]; ex.seats[c.id] = s ? { uid: s.uid, online: now - ms(s.lastSeen) < ONLINE_WINDOW } : null; });
    }
    onChange(S, cfg, ex);
  }
  function onErr(e) { console.error(e); stale = true; emit(); }
  unsubs.push(fs.onSnapshot(R.room, { includeMetadataChanges: true }, (s) => {
    room = s.exists() ? s.data({ serverTimestamps: 'estimate' }) : null; loaded.room = true;
    clearTimeout(cacheTimer);
    if (s.metadata && s.metadata.fromCache) cacheTimer = setTimeout(() => { stale = true; emit(); }, 6000);
    else stale = false;
    emit();
  }, onErr));
  unsubs.push(fs.onSnapshot(R.countries, (s) => { countries = {}; s.forEach((d) => { countries[d.id] = cdata(d); }); loaded.countries = true; emit(); }, onErr));
  if (watchSeats) {
    unsubs.push(fs.onSnapshot(R.seats, (s) => { seats = {}; s.forEach((d) => { seats[d.id] = d.data({ serverTimestamps: 'estimate' }); }); emit(); }, onErr));
    const t = setInterval(emit, 15000); unsubs.push(() => clearInterval(t));
  }
  if (typeof window !== 'undefined') {
    const on = () => { online = true; emit(); }, off = () => { online = false; emit(); };
    window.addEventListener('online', on); window.addEventListener('offline', off);
    unsubs.push(() => { window.removeEventListener('online', on); window.removeEventListener('offline', off); });
  }

  const tx = (fn) => fs.runTransaction(db, fn);
  async function readRoom(t) {
    const rs = await t.get(R.room);
    if (!rs.exists()) throw Object.assign(new Error('no room'), { code: 'not-found' });
    return rs.data();
  }

  const api = {
    code,
    stop() { unsubs.forEach((u) => u()); },
    submit(cid, key, answers) {
      return tx(async (t) => {
        const r0 = await readRoom(t); const cs = await t.get(R.country(cid));
        const s = { stage: r0.stage, countries: { [cid]: cdata(cs) } };
        const r = L.submit(s, cid, key, answers);
        if (!r.ok) return r;
        const upd = { ['ans.' + key]: clean(answers), op: { kind: 'submit', key } };
        if (r.firstTime) upd['first.' + key] = clean(answers);
        t.update(R.country(cid), upd);
        return r;
      });
    },
    curious(cid, data) {
      return tx(async (t) => {
        const r0 = await readRoom(t); const cs = await t.get(R.country(cid));
        const s = { stage: r0.stage, countries: { [cid]: cdata(cs) } };
        const r = L.submitCurious(s, cid, data);
        if (!r.ok) return r;
        t.update(R.country(cid), { curious: s.countries[cid].curious, op: { kind: 'curious' } });
        return r;
      });
    },
    /* ----- 교사 ----- */
    async setStage(n) { if (!L.STAGES.some((s) => s.n === n)) return fail('없는 단계예요.'); await fs.updateDoc(R.room, { stage: n }); return { ok: true }; },
    async reset() {
      const s = await fs.getDoc(R.room); if (!s.exists()) return fail('방을 찾을 수 없어요.');
      const b = fs.writeBatch(db);
      s.data().cfg.countries.forEach((c) => b.set(R.country(c.id), freshDoc()));
      b.update(R.room, { stage: 1 });
      await b.commit();
      return { ok: true };
    }
  };
  return api;
}
