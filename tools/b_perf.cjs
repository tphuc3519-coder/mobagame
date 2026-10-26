// Ngân sách vẽ trong giao tranh 5v5 (02 §2, Mốc 14): ≤ 150 draw call, ≤ 400k tam giác hiển thị, ≤ 12 skinned mesh cập nhật xương đầy đủ mỗi khung.
// Trận 5v5 thật (?mode=5v5), tua mô phỏng tới lúc lính hai bên gặp nhau ở đường giữa, gom cả 10 tướng (bot vẫn đánh, tung chiêu) quanh chỗ
// lính đụng nhau, camera theo tướng mình; bước tay 2 giây × 60 khung/giây. Mỗi khung: lệnh vẽ của mọi lượt (renderer.info: cảnh + bóng đổ +
// hậu kỳ), tam giác của lượt cảnh chính (hiển thị) và lượt bóng đổ tách riêng, số đơn vị có xương cập nhật hoạt ảnh đủ / thưa (views.animStats).
// Đo ở mức đồ hoạ Vừa (mặc định điện thoại) và Cao, lấy khung nặng nhất.
// Chạy: python3 -m http.server <PORT> --bind 127.0.0.1 ở gốc repo, rồi node tools/b_perf.cjs <PORT> [--q=mid,high] [--hero=kiem_thuy]
let PW; try { PW = require('playwright'); } catch (_) { PW = require('/opt/node22/lib/node_modules/playwright'); }
const port = +process.argv[2] || 8080;
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const QS = arg('q', 'mid,high').split(','), HERO = arg('hero', 'kiem_thuy');
const BUDGET = { calls: 150, tris: 400000, skin: 12 };
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };

async function measure(browser, q) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(`http://127.0.0.1:${port}/index.html?hero=${HERO}&mode=5v5&q=${q}&noauto=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world.tick > 20, null, { timeout: 300000, polling: 500 });
  const r = await page.evaluate(async () => {
    const g = window.__game, w = g.world, p = g.player, { lanePath, pointAt } = await import('/src/sim/lanes.js');
    g.loop.pause();
    for (let i = 0; i < 40 && !w.entities.some((e) => e.kind === 'minion' && e.alive && e.lane === 1); i++) g.loop.fastForward(30);
    g.loop.fastForward(30 * 30); // lính hai bên đi tới giữa đường và đụng nhau
    const mid = w.entities.filter((e) => e.kind === 'minion' && e.alive && e.lane === 1), lane = lanePath(w.map, 1, p.team);
    let c = pointAt(lane, lane.length * 0.5);
    if (mid.length) { const t0 = mid.filter((e) => e.team === 0), t1 = mid.filter((e) => e.team === 1), lead = (a, s) => a.reduce((b, e) => (!b || s(e) > s(b) ? e : b), null);
      const a = lead(t0, (e) => e.pos.x - e.pos.y), b = lead(t1, (e) => e.pos.y - e.pos.x); if (a && b) c = { x: (a.pos.x + b.pos.x) / 2, y: (a.pos.y + b.pos.y) / 2 }; }
    const heroes = w.entities.filter((e) => e.kind === 'hero');
    heroes.forEach((e, i) => { const k = e.team === p.team ? -1 : 1, j = i % 5; e.pos.x = e.prevPos.x = c.x + k * (160 + j * 40); e.pos.y = e.prevPos.y = c.y + (j - 2) * 120 - k * 100; e.dash = null; e.forced = null; });
    g.cam.follow(p.pos.x, p.pos.y, 0, 0, 1); // camera tới ngay chỗ giao tranh (không đo quãng camera trượt qua nửa bản đồ)
    // tam giác HIỂN THỊ = lượt vẽ cảnh chính (02 §2); lượt bóng đổ đếm riêng. Lệnh vẽ: mọi lượt (cảnh + bóng + hậu kỳ) như renderer.info.
    const R = g.renderer; let light = null; g.scene.traverse((o) => { if (!light && o.isDirectionalLight && o.castShadow) light = o; });
    let main = 0, sh = 0; const orig = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      const n = ((geometry.index ? geometry.index.count : geometry.attributes.position?.count || 0) / 3) * (object.isInstancedMesh ? object.count : 1);
      if (light?.shadow?.map && R.getRenderTarget() === light.shadow.map) sh += n; else if (!(camera.isOrthographicCamera && object.frustumCulled === false && geometry.attributes.position?.count === 3)) main += n;
      return orig(camera, scene, geometry, material, object, group);
    };
    const frames = [];
    for (let f = 0; f < 120; f++) {
      main = sh = 0; g.advance(1 / 60, 60); // 60 khung/giây: đơn vị hoạt ảnh thưa bỏ cách khung
      const i = g.renderer.info.render, a = g.views.animStats();
      frames.push({ calls: i.calls, tris: Math.round(main), shadow: Math.round(sh), all: i.triangles, upd: a.full, thin: a.thin });
    }
    // quét cả bản đồ: tướng mình (camera theo) đặt lần lượt trên lưới 3 200 (36 điểm) — chỗ cảnh dày nhất (rừng sau nhà, trại quái, hang mục tiêu lớn)
    const sweep = [], step = 3200, M = w.map;
    for (let y = step / 2; y < M.h; y += step) for (let x = step / 2; x < M.w; x += step) {
      p.pos.x = p.prevPos.x = x; p.pos.y = p.prevPos.y = y; p.dash = null; g.cam.follow(x, y, 0, 0, 1);
      g.advance(1 / 60, 60); main = sh = 0; g.advance(1 / 60, 60);
      sweep.push({ x, y, calls: g.renderer.info.render.calls, tris: Math.round(main) });
    }
    R.renderBufferDirect = orig;
    // thời gian CPU một lượt lọc cây cỏ (env/cull.js) — chạy khi camera dịch quá 1/3 lề
    const cu = g.env.cull, t0 = performance.now(); for (let i = 0; i < 40; i++) cu.update(g.cam.camera, true); const cullMs = (performance.now() - t0) / 40, cst = cu.stats;
    const top = (k) => sweep.reduce((a, b) => (b[k] > a[k] ? b : a));
    const sw = { n: sweep.length, calls: top('calls'), tris: top('tris'), callsAvg: Math.round(sweep.reduce((a, b) => a + b.calls, 0) / sweep.length), trisAvg: Math.round(sweep.reduce((a, b) => a + b.tris, 0) / sweep.length) };
    const max = (k) => Math.max(...frames.map((x) => x[k])), avg = (k) => Math.round(frames.reduce((a, x) => a + x[k], 0) / frames.length);
    const units = { minion: 0, monster: 0, hero: heroes.length }; for (const e of w.entities) if (e.alive && units[e.kind] != null && e.kind !== 'hero') units[e.kind]++;
    const near = w.entities.filter((e) => e.alive && e.kind === 'minion' && Math.hypot(e.pos.x - c.x, e.pos.y - c.y) < 1600).length;
    window.__perfFrames = frames.map((x) => x.calls);
    return { seq: frames.map((x) => x.calls).join(','), calls: max('calls'), callsAvg: avg('calls'), tris: max('tris'), trisAvg: avg('tris'), shadow: max('shadow'), all: max('all'), upd: max('upd'), thin: max('thin'), units, near, tick: w.tick, sw, cullMs, cst };
  });
  return { r, errs, close: () => ctx.close() };
}

(async () => {
  const browser = await PW.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const q of QS) {
    const { r, errs, close } = await measure(browser, q);
    if (process.env.PERF_SEQ) console.log(r.seq);
    console.log(`     mức ${q}: phút ${(r.tick / 1800).toFixed(1)} · lính trên sân ${r.units.minion} (${r.near} quanh giao tranh) · 10 tướng · draw ${r.callsAvg}/${r.calls} (TB/max, mọi lượt) · tam giác hiển thị ${r.trisAvg}/${r.tris} (+ bóng đổ ${r.shadow}, tổng ${r.all}) · hoạt ảnh xương đủ ${r.upd} / thưa ${r.thin}`);
    ok(`mức ${q}: giao tranh — ≤ ${BUDGET.calls} draw call`, r.calls <= BUDGET.calls, `max ${r.calls}`);
    console.log(`     mức ${q}: quét ${r.sw.n} điểm khắp bản đồ · draw TB ${r.sw.callsAvg}, nặng nhất ${r.sw.calls.calls} tại (${r.sw.calls.x}, ${r.sw.calls.y}) · tam giác hiển thị TB ${r.sw.trisAvg}, nặng nhất ${r.sw.tris.tris} tại (${r.sw.tris.x}, ${r.sw.tris.y})`);
    ok(`mức ${q}: mọi chỗ trên bản đồ — ≤ ${BUDGET.calls} draw call`, r.sw.calls.calls <= BUDGET.calls, `${r.sw.calls.calls}`);
    ok(`mức ${q}: mọi chỗ trên bản đồ — ≤ ${BUDGET.tris / 1000}k tam giác hiển thị`, r.sw.tris.tris <= BUDGET.tris, `${r.sw.tris.tris}`);
    ok(`mức ${q}: giao tranh — ≤ ${BUDGET.tris / 1000}k tam giác hiển thị`, r.tris <= BUDGET.tris, `max ${r.tris}`);
    ok(`mức ${q}: ≤ ${BUDGET.skin} đơn vị có xương cập nhật hoạt ảnh đủ mỗi khung`, r.upd <= BUDGET.skin && r.upd >= 10, `đủ ${r.upd} · thưa ${r.thin}`);
    ok(`mức ${q}: có giao tranh thật (≥ 6 lính quanh 10 tướng)`, r.near >= 6, `${r.near}`);
    console.log(`     mức ${q}: bộ lọc cây cỏ ${r.cst.meshes} mesh, ${r.cst.total} bản sao (đang vẽ ${r.cst.shown}) — một lượt lọc ${r.cullMs.toFixed(2)} ms`);
    ok(`mức ${q}: một lượt lọc cây cỏ dưới 2 ms (máy thử)`, r.cullMs < 2, r.cullMs.toFixed(2) + ' ms');
    ok(`mức ${q}: không lỗi trang`, !errs.length, errs.slice(0, 3).join(' | '));
    await close();
  }
  await browser.close();
  console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
  process.exit(fail ? 1 : 0);
})();
