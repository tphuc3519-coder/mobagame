// Kiểm thử trình duyệt cho nút Đánh thường (Playwright + Chromium phần mềm, màn cảm ứng 844×390) — phần mô phỏng đã có tools/t_basic.mjs,
// bộ này kiểm đường đi thật từ ngón tay tới trừ máu: chạm nhanh = đúng một đòn và trúng sau thời gian vung; giữ nút = đánh đều theo nhịp;
// mục tiêu bị dời xa giữa lúc vung = đòn trượt, không có sát thương, HUD vẽ chữ "Trượt" (docs/12_DANH_THUONG.md).
// Vòng tầm đánh (17/11): chưa đánh thì không có; chạm / giữ nút Đánh thì quanh tướng hiện đĩa tầm đúng bằng tầm đánh; thôi đánh thì tự tắt.
// Dùng: node tools/b_attack.cjs [cổng=8787] [thư mục lưu ảnh]   — cần máy chủ đang chạy ở cổng đó; in ĐẠT / LỖI từng mục, mã thoát 1 khi có lỗi.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const port = process.argv[2] || 8787, out = process.argv[3] || null;
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? 'ĐẠT ' : 'LỖI ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: out ? 2 : 1 }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  // ghi lại mọi dòng chữ HUD vẽ lên canvas: chữ nổi chỉ sống 0,8 giây — máy không GPU chụp ảnh không kịp, nên kiểm bằng chính lệnh vẽ
  await page.addInitScript(() => { window.__texts = new Set(); const P = CanvasRenderingContext2D.prototype, f = P.fillText; P.fillText = function (t, ...r) { window.__texts.add(String(t)); return f.call(this, t, ...r); }; });
  await page.goto(`http://127.0.0.1:${port}/?hero=kiem_thuy&dummies=1&q=low&noauto=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.world?.tick > 10, null, { timeout: 420000, polling: 500 });
  // hình nộm gần nhất đặt ngay trong tầm đánh, các con khác đẩy ra xa; ghi mọi sự kiện vung / sát thương / trượt của tướng mình
  await page.evaluate(() => { const g = window.__game, p = g.player, w = g.world; const d = w.entities.filter((e) => e.kind === 'dummy'); window.__d = d[0];
    const put = (e, x, y) => { e.pos.x = e.prevPos.x = x; e.pos.y = e.prevPos.y = y; }; window.__put = put; put(d[0], p.pos.x + 150, p.pos.y); for (const o of d.slice(1)) put(o, p.pos.x + 2500, p.pos.y);
    window.__ev = []; const emit = w.emit; w.emit = (t, data) => { if ((t === 'attack' || t === 'attackMiss') && data.id === p.id || t === 'damage' && data.src === p.id) window.__ev.push({ t, tick: w.tick, ...data }); return emit(t, data); }; });
  // vòng tầm đánh: ghi lại mỗi khung nó có hiện không (bán kính) — chạm nhanh thì vòng chỉ hiện chưa tới một giây
  await page.evaluate(() => { window.__ring = []; const tick = () => { const g = window.__game; if (!g) return; window.__ring.push(g.indicators.atkRangeShown()); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  await page.waitForTimeout(400);
  const count = (t) => page.evaluate((t) => window.__ev.filter((e) => e.t === t).length, t);
  const range = await page.evaluate(() => window.__game.player.stats.range);
  await page.waitForFunction(() => window.__ring.length >= 4, null, { timeout: 60000, polling: 100 }); // (đếm theo khung hình: máy không GPU vẽ chậm)
  ok('chưa bấm Đánh: không có vòng tầm đánh', await page.evaluate(() => window.__ring.every((r) => r === 0)));
  // 1) chạm nhanh nút Đánh thật (Playwright tap): đúng một đòn, sát thương đúng tick hết thời gian vung
  // (chờ theo tick mô phỏng chứ không theo đồng hồ: máy không GPU chạy chậm hơn thời gian thật)
  const ticksAfter = (n) => page.waitForFunction((n) => { const a = window.__ev.find((e) => e.t === 'attack'); return a && window.__game.world.tick >= a.tick + n; }, n, { timeout: 120000, polling: 100 });
  await page.tap('#skills [data-k="atk"]', { timeout: 120000 }); await ticksAfter(45);
  const a1 = await count('attack'), d1 = await count('damage');
  const swing = await page.evaluate(() => { const a = window.__ev.find((e) => e.t === 'attack'), d = window.__ev.find((e) => e.t === 'damage'); return a && d ? { got: d.tick - a.tick, want: Math.round(a.delay * 30) } : null; });
  ok('chạm nhanh nút Đánh trên màn cảm ứng: ra đúng một đòn, trúng đúng lúc hết thời gian vung', a1 === 1 && d1 === 1 && swing && swing.got === swing.want, `${a1} lần vung, ${d1} lần trúng, vung→trúng ${swing?.got} tick (thời gian vung ${swing?.want} tick)`);
  ok('thả tay xong tướng thôi đánh (không kẹt lệnh)', await page.evaluate(() => !window.__game.player.attacking));
  const tapRing = await page.evaluate(() => ({ seen: [...new Set(window.__ring.filter((r) => r > 0))], now: window.__game.indicators.atkRangeShown() }));
  ok('chạm nhanh nút Đánh: vòng tầm đánh hiện đúng bằng tầm đánh rồi tự tắt', tapRing.seen.length === 1 && tapRing.seen[0] === range && tapRing.now === 0, `vòng ${tapRing.seen.join(', ') || 'không hiện'} · tầm đánh ${range} · lúc này ${tapRing.now}`);
  // 2) giữ nút Đánh: đánh đều theo nhịp
  const btn = await page.locator('#skills [data-k="atk"]').boundingBox(), cx = btn.x + btn.width / 2, cy = btn.y + btn.height / 2;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  await page.waitForFunction(() => window.__ev.filter((e) => e.t === 'damage').length >= 4, null, { timeout: 60000, polling: 100 });
  const gaps = await page.evaluate(() => { const a = window.__ev.filter((e) => e.t === 'attack').map((e) => e.tick); return a.slice(2).map((t, i) => t - a[i + 1]); });
  const iv = await page.evaluate(() => Math.round(30 / window.__game.player.stats.atkSpeed));
  ok('giữ nút Đánh: các đòn cách nhau đúng một nhịp đánh', gaps.length >= 2 && gaps.every((g) => g === iv), `${gaps.join(', ')} tick (nhịp ${iv})`);
  ok('giữ nút Đánh: vòng tầm đánh hiện suốt, bán kính = tầm đánh', await page.evaluate(() => window.__game.indicators.atkRangeShown()) === range, `tầm đánh ${range}`);
  // 3) giữa lúc vung, mục tiêu bị dời đi xa (ngoài tầm đánh + khoảng dư): đòn trượt + chữ "Trượt" trên màn hình, không có sát thương
  const before = await count('damage'), textBefore = await page.evaluate(() => window.__texts.has('Trượt'));
  await page.evaluate(() => new Promise((res) => { const p = window.__game.player, n0 = window.__ev.filter((e) => e.t === 'attack').length; const iv = setInterval(() => { if (window.__ev.filter((e) => e.t === 'attack').length > n0) { clearInterval(iv); window.__put(window.__d, p.pos.x + 520, p.pos.y); res(); } }, 4); }));
  await page.waitForFunction(() => window.__ev.some((e) => e.t === 'attackMiss' && e.reason === 'range'), null, { timeout: 20000, polling: 30 });
  if (out) { await page.waitForTimeout(200); await page.screenshot({ path: `${out}/atk_miss.png` }); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  { const t0 = await page.evaluate(() => window.__game.world.tick); await page.waitForFunction((t0) => window.__game.world.tick >= t0 + 15, t0, { timeout: 60000, polling: 100 }); }
  ok('mục tiêu bị dời xa giữa lúc vung: đòn trượt, không có sát thương', (await count('damage')) === before && (await count('attackMiss')) >= 1);
  ok('đòn trượt có chữ "Trượt" vẽ trên màn hình (trước đây không hiện gì)', !textBefore && await page.evaluate(() => window.__texts.has('Trượt')));
  await page.waitForFunction(() => window.__game.indicators.atkRangeShown() === 0, null, { timeout: 30000, polling: 50 }).catch(() => {});
  ok('thả nút Đánh: vòng tầm đánh mờ dần rồi tắt', await page.evaluate(() => window.__game.indicators.atkRangeShown()) === 0);
  ok('không lỗi trang / console', !errs.length, errs.slice(0, 3).join(' | '));
  await browser.close(); console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt'); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('LỖI kịch bản', e.message.split('\n')[0]); process.exit(1); });
