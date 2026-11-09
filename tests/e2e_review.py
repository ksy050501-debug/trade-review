"""무역 탐정단 — 교사 1대 + 모둠 4대로 40분 복습 활동 전체 테스트 (가짜 Firebase 사용)
실행: python3 tests/e2e_live.py   (저장소 최상위에서)
"""
import asyncio, os, subprocess, sys, time, json, re
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAKE = os.path.join(ROOT, 'tests', 'fake-firebase')
SHOTS = os.path.join(ROOT, 'tests', 'shots')
os.makedirs(SHOTS, exist_ok=True)
PORT = 8125
BASE = f'http://127.0.0.1:{PORT}'
IDS = ['gaon', 'narae', 'daon', 'raon']
SPEC = {'gaon': 'rice', 'narae': 'oil', 'daon': 'car', 'raon': 'phone'}
QTY = {'rice': 400, 'oil': 800, 'car': 160, 'phone': 1600}   # 1년 목표량
UNIT = {'rice': 200, 'oil': 400, 'car': 80, 'phone': 800}   # 고정 거래량 (목표량의 절반)
results = []

def check(name, cond, detail=''):
    results.append((cond, name, detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f' — {detail}' if detail else ''))

async def route(context):
    async def fake(route_):
        name = route_.request.url.rsplit('/', 1)[-1]
        await route_.fulfill(path=os.path.join(FAKE, name), content_type='application/javascript')
    await context.route('https://www.gstatic.com/firebasejs/**', fake)
    async def cfg(route_):
        await route_.fulfill(body='export const firebaseConfig = { apiKey: "test", projectId: "test" };', content_type='application/javascript')
    await context.route('**/js/firebase-config.js', cfg)
    await context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))



RIGHT2 = {'t1':'x','t2':'o','t3':'o','t4':'o','t5':'x','t6':'x','t7':'o','t8':'x'}
FLIP = lambda d, ks: {k: (('o' if v == 'x' else 'x') if k in ks else v) for k, v in d.items()}
RIGHT3 = {'c1':'im','c2':'ex','c3':'im','c4':'ex','c5':'im','c6':'ex','c7':'im','c8':'ex','c9':'im','c10':'ex'}
RIGHT4 = {'banana':('ph','im'),'salmon':('no','im'),'grape':('cl','im'),'ore':('au','im'),'oil':('sa','im'),'car':('us','ex'),'chip':('cn','ex')}

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    errors = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
            await route(ctx)
            def watch(pg, label):
                pg.on('pageerror', lambda e: errors.append(f'{label}: {e}'))
                pg.on('console', lambda m: errors.append(f'{label}: {m.text}') if m.type == 'error' else None)
            T = await ctx.new_page(); watch(T, 'teacher')
            await T.goto(BASE + '/teacher.html')
            await T.click('[data-g=login]'); await T.click('[data-g=create]')
            await T.wait_for_selector('.bigcode')
            code = (await T.inner_text('.bigcode')).strip()
            check('교사가 수업 방을 만들고 입장 코드를 받음', bool(re.fullmatch(r'[A-Z0-9]{5}', code)), code)
            S = {}
            for cid in IDS:
                pg = await ctx.new_page(); await pg.set_viewport_size({'width': 1024, 'height': 1300}); watch(pg, cid)
                await pg.goto(BASE + '/?room=' + code)
                await pg.wait_for_selector(f'[data-g=pick][data-c={cid}]')
                await pg.click(f'[data-g=pick][data-c={cid}]'); await pg.click('[data-a=modal-yes]')
                await pg.wait_for_selector('.case-head')
                S[cid] = pg
            await asyncio.sleep(0.5)
            await S['gaon'].screenshot(path=f'{SHOTS}/r1-welcome.png', full_page=True)
            await T.bring_to_front()
            check('교사 화면: 네 모둠 접속 중', await T.locator('.seat .dot:not(.off):not(.idle)').count() == 4)

            async def stage(n):
                await T.click(f'.stepper-stages [data-a=stage][data-n="{n}"]'); await asyncio.sleep(0.5)
            async def press(pg, sel):
                await pg.wait_for_function(f'(()=>{{const b=document.querySelector({json.dumps(sel)});return b&&!b.disabled}})()')
                await pg.click(sel); await asyncio.sleep(0.12)
            async def score(pg):
                return int((await pg.inner_text('.scorechip b')).strip())

            # ---------- 사건 1 ----------
            await stage(2)
            plan2 = {'gaon': RIGHT2, 'narae': RIGHT2, 'daon': FLIP(RIGHT2, ['t1', 't7']), 'raon': FLIP(RIGHT2, ['t5'])}
            for cid, ans in plan2.items():
                for t, v in ans.items():
                    await press(S[cid], f'[data-a=s2][data-i={t}][data-v={v}]')
                await press(S[cid], '[data-a=submit]')
            await asyncio.sleep(0.6)
            sc = {c: await score(S[c]) for c in IDS}
            check('사건 1 점수: 40·40·30·35', sc == {'gaon':40,'narae':40,'daon':30,'raon':35}, str(sc))
            await S['daon'].screenshot(path=f'{SHOTS}/r2-case1-fix.png', full_page=True)
            for cid in ['daon', 'raon']:
                for t, v in RIGHT2.items():
                    await press(S[cid], f'[data-a=s2][data-i={t}][data-v={v}]')
                await press(S[cid], '[data-a=submit]')
            await asyncio.sleep(0.6)
            solved = [await S[c].locator('.result.done').count() for c in IDS]
            sc2 = {c: await score(S[c]) for c in IDS}
            check('고쳐서 다시 내면 모두 해결, 점수는 그대로', all(solved) and sc2 == sc, f'{solved} {sc2}')

            # ---------- 사건 2 ----------
            await stage(3)
            for i, cid in enumerate(IDS):
                for card, v in RIGHT3.items():
                    vv = v if not (i >= 2 and card in ('c1', 'c2')) else ('ex' if v == 'im' else 'im')
                    await press(S[cid], f'[data-a=s3][data-i={card}][data-v={vv}]')
                    if cid == 'gaon' and card == 'c5':
                        await S[cid].reload(); await S[cid].wait_for_selector('.ccards')
                        kept = await S[cid].locator('.ch.on').count()
                        check('제출 전 새로고침해도 고른 답이 남음', kept == 5, str(kept))
                await press(S[cid], '[data-a=submit]')
            await asyncio.sleep(0.6)
            sc3 = {c: await score(S[c]) for c in IDS}
            check('사건 2 누적: 90·90·70·75', sc3 == {'gaon':90,'narae':90,'daon':70,'raon':75}, str(sc3))
            await S['raon'].screenshot(path=f'{SHOTS}/r3-case2.png', full_page=True)

            # ---------- 사건 3 ----------
            await stage(4)
            for i, cid in enumerate(IDS):
                pg = S[cid]
                for item, (place, d) in RIGHT4.items():
                    if cid == 'narae' and item == 'car': d = 'im'
                    if cid == 'daon' and item == 'chip': place = 'us'
                    await press(pg, f'[data-a=s4-item][data-v={item}]')
                    await pg.click(f'g[data-a=s4-place][data-v={place}] .hit'); await asyncio.sleep(0.1)
                    await press(pg, f'[data-a=s4-dir][data-v={d}]')
                if cid == 'gaon': await pg.screenshot(path=f'{SHOTS}/r4-map.png', full_page=True)
                await press(pg, '[data-a=submit]')
            await asyncio.sleep(0.6)
            sc4 = {c: await score(S[c]) for c in IDS}
            check('사건 3 누적: 160·155·135·145', sc4 == {'gaon':160,'narae':155,'daon':135,'raon':145}, str(sc4))
            await S['narae'].screenshot(path=f'{SHOTS}/r4-map-fix.png', full_page=True)
            await T.bring_to_front(); await T.screenshot(path=f'{SHOTS}/r4-teacher.png', full_page=True)
            rows = await T.locator('.mgrid tbody tr').all_inner_texts()
            check('교사 점수표: 가온국 1위', rows[0].strip().startswith('1') and '가온국' in rows[0], rows[0][:40])
            await T.click('[data-a=view][data-v=projector]'); await asyncio.sleep(0.4)
            await T.screenshot(path=f'{SHOTS}/r4-projector.png', full_page=True)
            await T.click('[data-a=view][data-v=teacher]')

            # ---------- 마지막 사건 ----------
            await stage(5)
            notes = {'gaon': ('f1', '우리나라는 추워서 바나나를 많이 기르기 어려워서', '비닐하우스는 비쌀까?'),
                     'narae': ('f2', '외국 차가 더 싸거나 다른 기능이 있어서', ''),
                     'daon': ('f3', '석유를 사 와서 휘발유로 만들어 파는 것 같아요', '그러면 돈을 벌 수 있을까?'),
                     'raon': ('f1', '필리핀이 바나나를 더 많이 키울 수 있어서', '')}
            check('마지막 사건에는 점수가 안 보임', await S['gaon'].locator('.scorechip').count() == 0)
            for cid, (card, guess, q) in notes.items():
                pg = S[cid]
                await press(pg, f'[data-a=s5-card][data-v={card}]')
                await pg.fill(f'#guess-{cid}', guess)
                if q: await pg.fill(f'#question-{cid}', q)
                await press(pg, '[data-a=s5-send]')
            await asyncio.sleep(0.6)
            await S['daon'].screenshot(path=f'{SHOTS}/r5-curious.png', full_page=True)
            await T.bring_to_front()
            wall = await T.inner_text('.qwall')
            check('교사 화면에 네 모둠의 추측이 모임', all(n[1][:8] in wall for n in notes.values()))

            # ---------- 마무리 ----------
            await stage(6)
            await T.click('[data-a=view][data-v=projector]'); await asyncio.sleep(0.4)
            txt = await T.inner_text('main')
            check('발표 화면: 질문 모음 + "왜 무역을 할까" + 최종 점수', '탐정단이 남긴 질문' in txt and '왜 서로 무역을 할까요' in txt and '최종 점수' in txt)
            await T.screenshot(path=f'{SHOTS}/r6-projector.png', full_page=True)
            await S['gaon'].screenshot(path=f'{SHOTS}/r6-student.png', full_page=True)
            check('학생 마무리 화면: 내일 국왕 안내', '국왕' in await S['gaon'].inner_text('.hook'))
            check('이유(정답)는 어디에도 알려 주지 않음', all(w not in txt for w in ['잘 만드는', '집중 생산', '특화']))

            # 첫 답은 바꿀 수 없음: 사건 1 단계로 돌아가 다시 제출해도 점수 그대로
            await T.click('[data-a=view][data-v=teacher]'); await stage(2)
            pg = S['daon']; await pg.wait_for_selector('.case-head')
            check('되돌아가도 처음 점수 유지', await score(pg) == 135)

            D = await ctx.new_page(); watch(D, 'demo')
            await D.goto(BASE + '/demo.html'); await D.wait_for_selector('#views button')
            check('시연 모드 열림', await D.locator('#views button').count() == 6)
            M = await ctx.new_page(); await M.set_viewport_size({'width': 390, 'height': 844}); watch(M, 'mobile')
            await M.goto(BASE + '/demo.html#gaon'); await asyncio.sleep(0.6)
            sw = await M.evaluate('document.documentElement.scrollWidth')
            check('휴대폰 너비에서 가로 넘침 없음', sw <= 390, str(sw))
            await b.close()
    finally:
        srv.terminate()
    bad = [e for e in errors if 'favicon' not in e and 'Failed to load resource' not in e]
    check('브라우저 오류 없음', not bad, '; '.join(bad[:5]))
    fails = [r for r in results if not r[0]]
    print(f'\n결과: {len(results) - len(fails)}/{len(results)} 통과')
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    asyncio.run(main())
