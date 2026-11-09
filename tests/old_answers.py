"""어제 버전 방(ver 1)과 옛 형식 답이 남은 상황 재현 테스트"""
import asyncio, subprocess, sys, time, os, json
sys.path.insert(0, os.path.dirname(__file__))
from e2e_review import route, ROOT, PORT, BASE, RIGHT2
from playwright.async_api import async_playwright
res = []
def check(n, c, d=''):
    res.append(c); print(('PASS ' if c else 'FAIL ') + n + (f' — {d}' if d else ''))
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1200, 'height': 900}); await route(ctx)
            T = await ctx.new_page(); errs = []
            T.on('pageerror', lambda e: errs.append(str(e)))
            await T.goto(BASE + '/teacher.html'); await T.click('[data-g=login]'); await T.click('[data-g=create]'); await T.wait_for_selector('.bigcode')
            code = (await T.inner_text('.bigcode')).strip()
            # 같은 방을 하나 더: 어제 버전(ver 1)인 것처럼 바꿔 둠
            await T.evaluate("([c]) => { const st = JSON.parse(localStorage.getItem('FAKEFS')); const r = JSON.parse(JSON.stringify(st['reviewRooms/' + c])); r.d.ver = 1; st['reviewRooms/OLD99'] = r; localStorage.setItem('FAKEFS', JSON.stringify(st)); }", [code])
            await T.click('[data-a=stage][data-n="2"] >> nth=0'); await asyncio.sleep(0.4)
            S = await ctx.new_page(); S.on('pageerror', lambda e: errs.append('S ' + str(e)))
            await S.goto(BASE + '/?room=' + code); await S.click('[data-g=pick][data-c=gaon]'); await S.click('[data-a=modal-yes]'); await S.wait_for_selector('.ccards')
            # 이 기기에 어제 버전 초안(낱말 칸)이 남아 있는 상황
            await S.evaluate("([c, r]) => localStorage.setItem('review.draft.' + c + '.gaon.s2', JSON.stringify(Object.assign({trade:'d1',export:'d2',import:'d3'}, r)))", [code, RIGHT2])
            await S.reload(); await S.wait_for_selector('.ccards')
            await S.click('[data-a=submit]'); await asyncio.sleep(0.8)
            txt = await S.inner_text('main')
            check('옛 낱말 칸이 섞인 답도 제출되고 40/40점', '40/40점' in txt or '사건 해결' in txt, txt[:80].replace('\n', ' '))
            await T.click('[data-a=rooms]'); await asyncio.sleep(0.8)
            lst = await T.inner_text('main')
            check('어제 버전 방은 "이전 버전 · 열 수 없음"으로 표시', 'OLD99' in lst and '이전 버전' in lst)
            S2 = await ctx.new_page(); await S2.goto(BASE + '/?room=OLD99'); await asyncio.sleep(1)
            check('학생이 어제 방 코드로 들어오면 새 코드 안내', '지난번 수업 방' in await S2.inner_text('main'))
            check('브라우저 오류 없음', not errs, '; '.join(errs[:3]))
            await b.close()
    finally: srv.terminate()
    print(f'\n결과: {sum(res)}/{len(res)} 통과'); sys.exit(0 if all(res) else 1)
asyncio.run(main())
