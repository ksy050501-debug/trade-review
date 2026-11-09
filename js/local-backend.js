/* 시연 모드 저장소: 이 기기의 브라우저에만 저장합니다. 같은 브라우저의 다른 탭과는 함께 바뀝니다. */
(function (root) {
  'use strict';
  const L = root.TradeLogic;
  const KEY_S = 'review.state.v1';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  function createLocalBackend(onChange) {
    const cfg = L.clone(L.DEFAULT_CONFIG);
    let S = (() => { try { const s = JSON.parse(get(KEY_S)); if (s && s.countries) return s; } catch (e) {} return L.createState(cfg); })();
    const emit = () => onChange(S, cfg, { online: true });
    const done = (r) => { set(KEY_S, JSON.stringify(S)); emit(); return Promise.resolve(r); };
    window.addEventListener('storage', (e) => { if (e.key !== KEY_S || !e.newValue) return; try { S = JSON.parse(e.newValue); } catch (err) { return; } emit(); });
    return {
      start() { emit(); },
      submit: (cid, key, a) => done(L.submit(S, cid, key, a)),
      curious: (cid, d) => done(L.submitCurious(S, cid, d)),
      setStage: (n) => done(L.setStage(S, cfg, n)),
      reset() { S = L.createState(cfg); return done({ ok: true }); }
    };
  }
  root.createLocalBackend = createLocalBackend;
})(window);
