// Kiểm thử trình duyệt Phòng tuỳ chỉnh + hàng chờ trên máy chủ thật (tự mở server/index.mjs ở một cổng ngẫu nhiên, phục vụ luôn file game):
//  • máy A tạo phòng qua giao diện (thẻ bản đồ, công tắc máy), bấm Mời → link mời ?room=MÃ&server=… (không có navigator.share thì chép);
//  • máy B mở link → tự vào đúng phòng, địa chỉ bỏ ?room; máy C gõ mã sai → báo "Không thấy phòng" + rung 4 ô; dán link vào ô mã → vào phòng;
//  • hàng chờ Đấu thường: ô tìm trận đếm ngược "Máy vào thay chỗ trống sau …" theo 'left' máy chủ gửi.
// Chạy: node tools/b_invite.cjs        (dòng cuối "Tất cả đạt")
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
let PW; try { PW = require('playwright'); } catch (_) { PW = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = PW;
const { spawn } = require('child_process');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRV = 20000 + Math.floor(Math.random() * 20000);
let fails = 0; const ok = (c, m, x = '') => { if (!c) fails++; console.log(`${c ? 'ĐẠT' : 'LỖI'} ${m}${x ? '  ' + x : ''}`); };
(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, 'server/index.mjs')], { env: { ...process.env, PORT: String(SRV), HOST: '127.0.0.1', QUEUE_WAIT: '20' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', (d) => process.env.V && process.stdout.write('[srv] ' + d));
  await new Promise((r) => setTimeout(r, 800));
  const base = `http://127.0.0.1:${SRV}/`, ws = `ws://127.0.0.1:${SRV}/ws`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const mk = async () => {
    const ctx = await b.newContext({ viewport: { width: 852, height: 252 }, hasTouch: true });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await ctx.newPage(); page.errs = [];
    page.on('pageerror', (e) => page.errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text()); });
    return page;
  };
  try {
    const A = await mk();
    await A.goto(base + '?server=' + encodeURIComponent(ws), { waitUntil: 'domcontentloaded' });
    await A.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: 90000 });
    await A.evaluate(() => window.__flow.nav.go('custom')); await A.waitForTimeout(400);
    await A.click('[data-map="1v1"]'); await A.click('[data-sw="bots"]');
    ok(await A.evaluate(() => document.querySelector('[data-map="1v1"]').classList.contains('on') && !document.querySelector('[data-sw="bots"]').classList.contains('on')), 'A: chọn thẻ 1v1 + tắt máy');
    await A.click('[data-map="5v5"]');
    await A.click('[data-a="create"]');
    await A.waitForFunction(() => window.__online?.room?.code, null, { timeout: 20000 });
    const code = await A.evaluate(() => window.__online.room.code);
    ok(/^[A-Z0-9]{4}$/.test(code), 'A: tạo phòng có mã', code);
    ok(await A.evaluate(() => document.querySelector('.ol-cd')?.getBoundingClientRect().width > 30 && document.querySelector('.ol-cd').textContent), 'A: mã phòng hiện trên đầu (không bị ẩn)');
    // Mời: không có navigator.share (Chromium Linux) → chép link vào bộ nhớ tạm
    await A.evaluate(() => { delete navigator.share; });
    await A.click('[data-a="share"]'); await A.waitForTimeout(300);
    const clip = await A.evaluate(() => navigator.clipboard.readText());
    const m = clip.match(/https?:\/\/\S+/); const link = m && m[0];
    ok(link && link.includes('room=' + code) && link.includes('server='), 'A: Mời → chép link mời có mã + máy chủ', link || clip);
    // B mở link → vào phòng luôn
    const B = await mk();
    await B.goto(link, { waitUntil: 'domcontentloaded' });
    await B.waitForFunction(() => window.__online?.room?.code, null, { timeout: 90000 }).catch(() => {});
    const rb = await B.evaluate(() => ({ code: window.__online?.room?.code, n: window.__online?.room?.players.length, scr: window.__flow.nav.screen, url: location.search }));
    ok(rb.code === code && rb.n === 2 && rb.scr === 'custom', 'B: mở link mời → tự vào đúng phòng (2 người)', JSON.stringify(rb));
    ok(!/room=/.test(rb.url), 'B: bỏ ?room khỏi địa chỉ (tải lại không vào lại)', rb.url);
    await A.waitForFunction(() => window.__online.room.players.length === 2, null, { timeout: 5000 }).catch(() => {});
    ok(await A.evaluate(() => window.__online.room.players.length === 2), 'A: thấy B vào phòng');
    // C gõ mã sai → báo lỗi + rung 4 ô
    const C = await mk();
    await C.goto(base + '?server=' + encodeURIComponent(ws), { waitUntil: 'domcontentloaded' });
    await C.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: 90000 });
    await C.evaluate(() => window.__flow.nav.go('custom')); await C.waitForTimeout(400);
    await C.click('.otp'); await C.keyboard.type('zz99', { delay: 40 });
    await C.waitForFunction(() => document.querySelector('.otp.bad'), null, { timeout: 8000 }).catch(() => {});
    const cc = await C.evaluate(() => ({ bad: !!document.querySelector('.otp.bad'), toast: document.querySelector('.ui-toast')?.textContent, boxes: [...document.querySelectorAll('.otp .bx i')].map((i) => i.textContent).join('') }));
    ok(cc.bad && /Không thấy phòng/.test(cc.toast || ''), 'C: gõ đủ 4 ký tự mã sai → tự thử vào, báo "Không thấy phòng", rung ô mã', JSON.stringify(cc));
    ok(cc.boxes === 'ZZ99', 'C: ô mã viết hoa', cc.boxes);
    // C dán cả link mời vào ô mã → nhận mã, vào phòng
    await C.evaluate((l) => { const i = document.getElementById('olCode'); i.value = l; i.dispatchEvent(new Event('input', { bubbles: true })); }, `${base}?room=${code.toLowerCase()}`);
    await C.waitForFunction(() => window.__online?.room?.code, null, { timeout: 10000 }).catch(() => {});
    ok(await C.evaluate((c) => window.__online?.room?.code === c, code), 'C: dán link mời vào ô mã → vào phòng', await C.evaluate(() => document.querySelector('.ui-toast')?.textContent || ''));
    // hàng chờ: đếm ngược máy vào thay
    await C.evaluate(() => window.__flow.nav.go('home')); await C.waitForTimeout(300);
    await C.evaluate(async () => { const { profile, saveProfile } = await import('/src/ui/profile.js'); const p = profile(); p.rolePri = 'mid'; p.roleSec = 'jungle'; saveProfile(); }); // có sẵn vị trí: bấm Bắt đầu là vào hàng chờ
    await C.evaluate(() => window.__flow.nav.go('room', { mode: 'normal' })); await C.waitForTimeout(400);
    await C.click('[data-a="go"]'); await C.waitForTimeout(600);
    await C.waitForFunction(() => /Máy vào thay/.test(document.querySelector('#room .mm .tx small')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
    const t1 = await C.evaluate(() => document.querySelector('#room .mm .tx small')?.textContent || document.querySelector('#room .mm')?.textContent || '(không có ô tìm trận)');
    await C.waitForTimeout(2100);
    const t2 = await C.evaluate(() => document.querySelector('#room .mm .tx small')?.textContent || '');
    const s1 = +(t1.match(/(\d+):(\d+)/) || [0, 0, 0]).slice(1).reduce((a, x) => a * 60 + +x, 0), s2 = +(t2.match(/(\d+):(\d+)/) || [0, 0, 0]).slice(1).reduce((a, x) => a * 60 + +x, 0);
    ok(/Máy vào thay/.test(t1) && s1 > 0 && s1 <= 20 && s2 < s1, 'hàng chờ: hiện đếm ngược máy vào thay, giảm dần', `${t1} → ${t2}`);
    if (process.env.SHOTS) await C.screenshot({ path: path.join(process.env.SHOTS, 'invite_queue.png') });
    for (const [n, p] of [['A', A], ['B', B], ['C', C]]) ok(!p.errs.length, `${n}: không lỗi trang / console`, p.errs.slice(0, 3).join(' | '));
  } catch (e) { fails++; console.log('LỖI ngoại lệ', e.message); }
  await b.close(); srv.kill();
  console.log(fails ? `LỖI: ${fails} mục` : 'Tất cả đạt'); process.exit(fails ? 1 : 0);
})();
