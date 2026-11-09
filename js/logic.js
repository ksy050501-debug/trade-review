/* =========================================================
 * 무역 탐정단 — 문제·정답·점수 (화면과 분리된 순수 로직)
 * 이전 차시(무역·수출·수입의 뜻)를 모둠 게임으로 복습하고,
 * 마지막에 "나라들은 왜 무역을 할까?"라는 궁금증을 남깁니다.
 * 답(이유)은 알려 주지 않습니다 — 다음 날 「무역의 발견」에서 직접 알아봅니다.
 * 브라우저: window.TradeLogic / Node: require('./logic.js')
 * ========================================================= */
(function (root) {
  'use strict';

  const COUNTRIES = [
    { id: 'gaon',  name: '가온국', color: '#2f6fdb', flag: 'stripes' },
    { id: 'narae', name: '나래국', color: '#d9622b', flag: 'circle' },
    { id: 'daon',  name: '다온국', color: '#13917f', flag: 'cross' },
    { id: 'raon',  name: '라온국', color: '#8e44b8', flag: 'diagonal' }
  ];

  const STAGES = [
    { n: 1, key: null, title: '탐정단 입장',           short: '입장',   min: 3 },
    { n: 2, key: 's2', title: '사건 1 · 낱말 짝짓기',   short: '낱말',   min: 5 },
    { n: 3, key: 's3', title: '사건 2 · 수출일까, 수입일까?', short: '분류', min: 10 },
    { n: 4, key: 's4', title: '사건 3 · 물건의 여행 지도', short: '지도', min: 10 },
    { n: 5, key: 's5', title: '마지막 사건 · 이상한 사실', short: '궁금증', min: 8 },
    { n: 6, key: null, title: '수사 보고 · 질문 모으기', short: '마무리', min: 4 }
  ];
  const stageInfo = (n) => STAGES.find((s) => s.n === n) || STAGES[0];
  const stageNo = (n) => STAGES.findIndex((s) => s.n === n) + 1;
  const nextStage = (n, dir) => { const i = STAGES.findIndex((s) => s.n === n) + dir; return i >= 0 && i < STAGES.length ? STAGES[i].n : null; };
  const stageOfKey = (k) => (STAGES.find((s) => s.key === k) || {}).n;

  /* ---------- 사건 1: 낱말 짝짓기 (낱말마다 10점) ---------- */
  const S2 = {
    points: 10,
    terms: [
      { id: 'trade',  word: '무역' },
      { id: 'export', word: '수출' },
      { id: 'import', word: '수입' }
    ],
    defs: [
      { id: 'd1', text: '나라와 나라 사이에 물건이나 서비스를 사고파는 것', answer: 'trade' },
      { id: 'd2', text: '우리나라 물건을 다른 나라에 파는 것', answer: 'export' },
      { id: 'd3', text: '다른 나라 물건을 우리나라로 사 오는 것', answer: 'import' },
      { id: 'd4', text: '필요한 물건을 직접 만드는 것', answer: null },
      { id: 'd5', text: '번 돈을 쓰지 않고 모아 두는 것', answer: null }
    ]
  };

  /* ---------- 사건 2: 수출일까, 수입일까? (카드마다 5점) ---------- */
  const S3 = {
    points: 5,
    cards: [
      { id: 'c1',  icon: 'banana', text: '필리핀에서 바나나를 사 와요.', answer: 'im' },
      { id: 'c2',  icon: 'car',    text: '우리나라에서 만든 자동차를 미국에 팔아요.', answer: 'ex' },
      { id: 'c3',  icon: 'salmon', text: '노르웨이에서 연어를 들여와요.', answer: 'im' },
      { id: 'c4',  icon: 'chip',   text: '우리나라 반도체를 다른 나라 회사에 팔아요.', answer: 'ex' },
      { id: 'c5',  icon: 'grape',  text: '칠레에서 포도를 사 와요.', answer: 'im' },
      { id: 'c6',  icon: 'ramen',  text: '우리나라 라면이 외국 마트로 팔려 나가요.', answer: 'ex' },
      { id: 'c7',  icon: 'oil',    text: '중동 나라에서 원유(석유)를 배로 실어 와요.', answer: 'im' },
      { id: 'c8',  icon: 'ship',   text: '우리나라 조선소에서 만든 큰 배를 다른 나라에 팔아요.', answer: 'ex' },
      { id: 'c9',  icon: 'ore',    text: '호주에서 철광석을 들여와요.', answer: 'im' },
      { id: 'c10', icon: 'lotion', text: '우리나라 화장품을 외국 사람들이 사 가요.', answer: 'ex' }
    ]
  };

  /* ---------- 사건 3: 물건의 여행 지도 (나라 5점 + 방향 5점) ---------- */
  const PLACES = [
    { id: 'kr', name: '대한민국',       lon: 127.5, lat: 36.5, home: true },
    { id: 'cn', name: '중국',           lon: 104,   lat: 34 },
    { id: 'ph', name: '필리핀',         lon: 122,   lat: 12.5 },
    { id: 'au', name: '호주',           lon: 134,   lat: -25 },
    { id: 'sa', name: '사우디아라비아', lon: 45,    lat: 24 },
    { id: 'no', name: '노르웨이',       lon: 9,     lat: 61 },
    { id: 'us', name: '미국',           lon: -98,   lat: 39 },
    { id: 'cl', name: '칠레',           lon: -71,   lat: -32 }
  ];
  const S4 = {
    points: 5,
    items: [
      { id: 'banana', icon: 'banana', name: '바나나',   hint: '덥고 비가 많이 오는 동남아시아의 섬나라', place: 'ph', dir: 'im' },
      { id: 'salmon', icon: 'salmon', name: '연어',     hint: '춥고 깊은 바다가 있는 북유럽 나라',       place: 'no', dir: 'im' },
      { id: 'grape',  icon: 'grape',  name: '포도',     hint: '남아메리카의 길쭉한 나라. 우리나라가 겨울일 때 그곳은 여름이에요', place: 'cl', dir: 'im' },
      { id: 'ore',    icon: 'ore',    name: '철광석',   hint: '캥거루가 사는 남반구의 큰 나라',           place: 'au', dir: 'im' },
      { id: 'oil',    icon: 'oil',    name: '원유',     hint: '사막이 넓은 중동의 나라',                  place: 'sa', dir: 'im' },
      { id: 'car',    icon: 'car',    name: '자동차',   hint: '북아메리카의 넓은 나라. 우리나라 자동차를 많이 사 가요', place: 'us', dir: 'ex' },
      { id: 'chip',   icon: 'chip',   name: '반도체',   hint: '우리나라 서쪽 바로 옆, 사람이 아주 많은 나라', place: 'cn', dir: 'ex' }
    ]
  };

  /* ---------- 마지막 사건: 이상한 사실 (점수 없음) ---------- */
  const S5 = {
    cards: [
      { id: 'f1', icon: 'banana', title: '바나나의 수수께끼', text: '우리나라에서도 비닐하우스에서 바나나를 기를 수 있어요. 그런데 우리가 먹는 바나나는 대부분 외국에서 사 와요.' },
      { id: 'f2', icon: 'car',    title: '자동차의 수수께끼', text: '우리나라는 자동차를 많이 만들어서 외국에 팔아요. 그런데 외국 자동차도 사 와요.' },
      { id: 'f3', icon: 'oil',    title: '석유의 수수께끼',   text: '우리나라 땅에서는 석유가 거의 나지 않아요. 그런데 석유로 만든 휘발유와 경유를 외국에 팔기도 해요.' }
    ],
    maxLen: 200
  };

  const MAX_SCORE = S2.terms.length * S2.points + S3.cards.length * S3.points + S4.items.length * S4.points * 2;

  /* ---------- 상태 ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const countryById = (cfg, id) => cfg.countries.find((c) => c.id === id);
  const placeById = (id) => PLACES.find((p) => p.id === id);
  const fail = (msg) => ({ ok: false, error: msg });
  const okr = (x) => Object.assign({ ok: true }, x || {});
  const DEFAULT_CONFIG = { countries: COUNTRIES };
  function freshCountry() { return { ans: {}, first: {}, curious: {} }; }
  function createState(cfg) {
    const countries = {}; cfg.countries.forEach((c) => { countries[c.id] = freshCountry(); });
    return { v: 1, stage: 1, countries };
  }

  /* ---------- 채점 ---------- */
  // 각 문항이 맞았는지: {문항id: true/false}
  function check(key, a) {
    a = a || {};
    const out = {};
    if (key === 's2') S2.terms.forEach((t) => { const d = S2.defs.find((x) => x.id === a[t.id]); out[t.id] = !!d && d.answer === t.id; });
    if (key === 's3') S3.cards.forEach((c) => { out[c.id] = a[c.id] === c.answer; });
    if (key === 's4') S4.items.forEach((it) => { const v = a[it.id] || {}; out[it.id] = { place: v.place === it.place, dir: v.dir === it.dir }; });
    return out;
  }
  function stagePoints(key, a) {
    const r = check(key, a);
    if (key === 's2') return Object.values(r).filter(Boolean).length * S2.points;
    if (key === 's3') return Object.values(r).filter(Boolean).length * S3.points;
    if (key === 's4') return Object.values(r).reduce((s, v) => s + (v.place ? S4.points : 0) + (v.dir ? S4.points : 0), 0);
    return 0;
  }
  const stageMax = (key) => key === 's2' ? S2.terms.length * S2.points : key === 's3' ? S3.cards.length * S3.points : key === 's4' ? S4.items.length * S4.points * 2 : 0;
  // 점수는 '처음 제출한 답'으로만 매김. 고쳐서 다시 낸 답은 사건 해결 여부에만 쓰임
  function score(s, cid) {
    const c = s.countries[cid] || freshCountry();
    const per = {};
    ['s2', 's3', 's4'].forEach((k) => { per[k] = c.first && c.first[k] ? stagePoints(k, c.first[k]) : null; });
    const total = Object.values(per).reduce((a, b) => a + (b || 0), 0);
    return { per, total };
  }
  function allCorrect(key, a) {
    const r = check(key, a);
    return Object.values(r).every((v) => (typeof v === 'object' ? v.place && v.dir : v));
  }
  // 사건 진행 상태: 'todo' 아직 안 냄, 'fix' 냈지만 틀린 것이 있음, 'done' 모두 맞음
  function status(s, cid, key) {
    const c = s.countries[cid] || freshCountry();
    if (key === 's5') return c.curious && c.curious.card && (c.curious.guess || '').trim() ? 'done' : 'todo';
    if (!c.first || !c.first[key]) return 'todo';
    return allCorrect(key, c.ans && c.ans[key]) ? 'done' : 'fix';
  }
  function ranking(s, cfg) {
    const rows = cfg.countries.map((c) => ({ id: c.id, name: c.name, total: score(s, c.id).total }));
    const sorted = rows.slice().sort((a, b) => b.total - a.total);
    sorted.forEach((r, i) => { r.rank = i > 0 && sorted[i - 1].total === r.total ? sorted[i - 1].rank : i + 1; });
    return sorted;
  }

  /* ---------- 제출 ---------- */
  function validAnswer(key, a) {
    if (!a || typeof a !== 'object') return false;
    if (key === 's2') return Object.keys(a).every((k) => S2.terms.some((t) => t.id === k) && S2.defs.some((d) => d.id === a[k]))
      && S2.terms.every((t) => a[t.id]);
    if (key === 's3') return S3.cards.every((c) => a[c.id] === 'ex' || a[c.id] === 'im') && Object.keys(a).length === S3.cards.length;
    if (key === 's4') return S4.items.every((it) => a[it.id] && PLACES.some((p) => p.id === a[it.id].place && !p.home) && (a[it.id].dir === 'ex' || a[it.id].dir === 'im'))
      && Object.keys(a).length === S4.items.length;
    return false;
  }
  function submit(s, cid, key, a) {
    const st = stageOfKey(key);
    if (!st || key === 's5') return fail('제출할 수 없는 사건이에요.');
    if (s.stage !== st) return fail('지금은 이 사건을 푸는 시간이 아니에요.');
    const c = s.countries[cid]; if (!c) return fail('나라를 찾을 수 없어요.');
    if (!validAnswer(key, a)) return fail(key === 's2' ? '세 낱말의 뜻을 모두 골라 주세요.' : key === 's3' ? '카드 10장을 모두 수출이나 수입으로 골라 주세요.' : '물건마다 나라와 방향(수출·수입)을 모두 골라 주세요.');
    c.ans = c.ans || {}; c.first = c.first || {};
    const firstTime = !c.first[key];
    if (firstTime) c.first[key] = clone(a);
    c.ans[key] = clone(a);
    return okr({ firstTime, points: firstTime ? stagePoints(key, a) : null, allCorrect: allCorrect(key, a) });
  }
  function submitCurious(s, cid, data) {
    if (s.stage !== 5) return fail('지금은 이상한 사실을 살펴보는 시간이 아니에요.');
    const c = s.countries[cid]; if (!c) return fail('나라를 찾을 수 없어요.');
    if (!S5.cards.some((x) => x.id === data.card)) return fail('수수께끼 카드를 하나 골라 주세요.');
    const guess = String(data.guess || '').trim(), question = String(data.question || '').trim();
    if (!guess) return fail('"왜 그럴까?" 우리 모둠의 추측을 적어 주세요.');
    if (guess.length > S5.maxLen || question.length > S5.maxLen) return fail(`${S5.maxLen}자 안으로 적어 주세요.`);
    c.curious = { card: data.card, guess, question };
    return okr();
  }
  function setStage(s, cfg, n) {
    if (!STAGES.some((x) => x.n === n)) return fail('없는 단계예요.');
    s.stage = n; return okr();
  }

  root.TradeLogic = {
    DEFAULT_CONFIG, COUNTRIES, STAGES, S2, S3, S4, S5, PLACES, MAX_SCORE,
    stageInfo, stageNo, nextStage, stageOfKey, clone, countryById, placeById, freshCountry, createState,
    check, stagePoints, stageMax, score, allCorrect, status, ranking, validAnswer, submit, submitCurious, setStage
  };
  if (typeof module !== 'undefined') module.exports = root.TradeLogic;
})(typeof window !== 'undefined' ? window : globalThis);
