// Hiệu ứng cho các sự kiện của kiểu chiêu mở rộng (sim/skillTypes.js) và nội tại của 14 tướng mở khoá: nhát chém đường thẳng, dây trói,
// phân thân giấy, phản đạn, tua ngược, chém liên hoàn, né đòn, trượt đòn, tráo máu, bùng nội tại; áp chế (xích), không thể cản, đồ kích hoạt.
// Chỉ vẽ; không đổi trạng thái trận.
import * as THREE from 'three';
import { TILE } from './atlas.js';

const R = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/** api: hàm dùng chung của library.js (hạt, hình khối, tra đơn vị). Trả bảng { loại sự kiện: (ev, e) => void }. */
export function createExtraFx(api) {
  const { A, N, sh, flash, burst, sparks, slash, rootOf, headOf, ent, visible, themeOf, aura, dust } = api;
  const cut = new Set(); // dây trói đã đứt / hết giờ (khoá `${người trói}:${mục tiêu}`) — không ghi gì vào đơn vị của mô phỏng
  const cutS = new Set(); // xích áp chế đã đứt / hết giờ (cùng kiểu khoá)
  const at = (id, y = 120) => { const r = rootOf(id); return r ? r.clone().setY(r.y + y) : null; };
  return {
    /** Đường thẳng (nét mực, tia lửa, nhát chém): vệt sáng chạy dọc hình chữ nhật + vạch trên đất. */
    line(ev, e) {
      if (!visible(e)) return;
      const th = themeOf(e), L = ev.range, W = ev.width || 100, n = Math.max(6, Math.round(L / 60)), rot = Math.atan2(ev.dx, ev.dy * 0.62);
      sh.decal('glow', ev.x + ev.dx * L * 0.5, ev.y + ev.dy * L * 0.5, Math.max(W, L * 0.5) * 0.6, { color: th.col, life: 0.35, alpha: 0.5, fadeIn: 0, rot: -Math.atan2(ev.dy, ev.dx) });
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), x = ev.x + ev.dx * L * k, z = ev.y + ev.dy * L * k;
        A.spawn({ x, y: 90 + R(-10, 10), z, life: 0.16 + k * 0.12, size: [W * 0.9, 12], color: [th.core, th.col], alpha: [0.9, 0], tile: TILE.streak, rot, fadeIn: 0 });
        if (i % 2 === 0) burst(A, x, 80, z, { n: 2, speed: [60, 180], up: [40, 200], life: [0.25, 0.45], size: [22, 4], color: [0xffffff, th.col], drag: 2.5 });
      }
      slash(ev.x + ev.dx * 90, 110, ev.y + ev.dy * 90, th.col, 220, 1, 0.2, rot);
    },
    /** Dây trói bóng: sợi nối người trói và mục tiêu suốt thời gian trói. */
    tether(ev, e) {
      const t = ent(ev.target); if (!t || (!visible(e) && !visible(t))) return;
      const th = themeOf(e), until = performance.now() + (ev.dur || 2) * 1000 + 120, key = ev.id + ':' + ev.target; cut.delete(key);
      sh.chain(() => at(ev.id, 130), () => at(ev.target, 140), { color: th.col, width: 9, life: (ev.dur || 2) + 0.3, kill: () => performance.now() > until || !e.alive || !t.alive || cut.has(key) });
      aura(ev.dur || 2, () => { const p = at(ev.target, 60); if (p && Math.random() < 0.5) A.spawn({ x: p.x + R(-40, 40), y: p.y + R(-20, 60), z: p.z + R(-40, 40), vy: R(-40, 40), life: 0.5, size: [26, 6], color: [0xe0d0ff, th.col], tile: TILE.smoke, drag: 1 }); }, () => performance.now() > until);
    },
    tetherEnd(ev, e) {
      cut.add(ev.id + ':' + ev.target); // dây đứt sớm / hết giờ: gỡ dây
      const t = ent(ev.target), p = t && rootOf(t.id); if (!p || !visible(t)) return;
      const th = themeOf(e);
      if (ev.ok) { flash(p.x, 150, p.z, 200, th.col, 0.2); burst(A, p.x, 140, p.z, { n: 16, speed: [120, 320], up: [40, 220], life: [0.3, 0.6], size: [26, 5], color: [0xffffff, th.col], tile: TILE.star, drag: 2 }); }
      else burst(N, p.x, 130, p.z, { n: 10, speed: [80, 220], up: [20, 160], life: [0.4, 0.7], size: [40, 70], color: [0x6a5a8a, 0x1a1428], alpha: [0.6, 0], tile: TILE.smoke, drag: 2 });
    },
    /** Phân thân giấy: giấy vụn bung ra ở chỗ xuất hiện / tan. */
    clones(ev, e) {
      if (!visible(e)) return;
      for (const id of ev.clones || []) { const c = ent(id); if (!c) continue; flash(c.pos.x, 120, c.pos.y, 160, themeOf(e).col, 0.2); burst(N, c.pos.x, 120, c.pos.y, { n: 14, speed: [100, 300], up: [100, 360], life: [0.6, 1.1], size: [26, 18], color: [0xffffff, 0xf2e6d0], tile: TILE.feather, spinR: 10, grav: 500, drag: 2 }); }
    },
    cloneEnd(ev) { burst(N, ev.x, 120, ev.y, { n: 12, speed: [60, 200], up: [80, 260], life: [0.6, 1], size: [24, 16], color: [0xffffff, 0xe8dcc6], tile: TILE.feather, spinR: 10, grav: 400, drag: 2 }); },
    cloneSwap(ev, e) { if (!visible(e)) return; const c = ent(ev.clone); if (c) burst(N, c.pos.x, 120, c.pos.y, { n: 10, speed: [60, 200], up: [60, 240], life: [0.5, 0.9], size: [24, 16], color: [0xffffff, 0xf2e6d0], tile: TILE.feather, spinR: 10, grav: 400, drag: 2 }); },
    /** Đạn bị hất ngược: vòng sóng loé chỗ va + tia lửa. */
    reflect(ev, e) {
      if (!visible(e)) return; const th = themeOf(e);
      flash(ev.x, 110, ev.y, 150, 0xffffff, 0.12); sh.ring(ev.x, ev.y, 10, 120, { color: th.col, width: 0.14, life: 0.3 }); sparks(ev.x, 110, ev.y, th.col, 12, 0.9);
    },
    /** Tua ngược: vệt kim đồng hồ ở chỗ đi + chỗ đến. */
    rewind(ev, e) {
      if (!visible(e)) return; const th = themeOf(e);
      for (const p of [ev.from, ev.to]) { sh.decal('rune', p.x, p.y, 170, { color: th.col, life: 0.8, alpha: 0.8, spin: -3, fadeIn: 0 }); flash(p.x, 120, p.y, 220, th.col, 0.25); }
      const n = 10; for (let i = 0; i < n; i++) { const k = i / (n - 1), x = ev.from.x + (ev.to.x - ev.from.x) * k, z = ev.from.y + (ev.to.y - ev.from.y) * k; A.spawn({ x, y: 120 + R(-20, 20), z, life: 0.5 + k * 0.3, size: [50, 10], color: [0xffffff, th.col], tile: TILE.glow, drag: 1 }); }
    },
    /** Chuỗi chém liên hoàn: vòng sáng dưới chân suốt chuỗi; mỗi nhát một vết chém quanh mình. */
    slashes(ev, e) { if (!visible(e)) return; const p = e.pos; sh.decal('rune', p.x, p.y, ev.radius || 280, { color: themeOf(e).col, life: ev.dur || 1.3, alpha: 0.55, spin: 4, fadeIn: 0.05 }); },
    slash(ev, e) {
      if (!visible(e)) return; const th = themeOf(e), a = R(0, TAU), r = R(40, 180), x = ev.x + Math.cos(a) * r, z = ev.y + Math.sin(a) * r;
      slash(x, R(80, 160), z, th.col, ev.last ? 420 : 240, ev.last ? 2 : 1, 0.2);
      if (ev.last) { flash(ev.x, 120, ev.y, 360, th.col, 0.2); sh.ring(ev.x, ev.y, 30, 300, { color: th.col, width: 0.12, life: 0.4 }); }
    },
    /** Lao khoá mục tiêu: vệt sáng nối tới mục tiêu một nhịp. */
    dashTo(ev, e) { const t = ent(ev.target); if (!t || !visible(e)) return; const th = themeOf(e), until = performance.now() + 450; sh.chain(() => at(ev.id, 90), () => at(ev.target, 90), { color: th.col, width: 4, life: 0.45, kill: () => performance.now() > until || !e.dash }); },
    /** Né hẳn đòn (Thấu Nhãn): bóng mờ lệch sang bên. */
    dodge(ev, e) { if (!e || !visible(e)) return; const p = rootOf(e.id); if (!p) return; burst(A, p.x, 130, p.z, { n: 12, r: 30, speed: [200, 420], up: [0, 120], life: [0.2, 0.4], size: [40, 8], color: [0xffffff, themeOf(e).col], tile: TILE.streak, drag: 4 }); },
    /** Đánh trượt (Hào Quang Sân Khấu): vệt khói xám ở người bị đánh. */
    miss(ev) { const t = ent(ev.id), p = t && rootOf(t.id); if (!p || !visible(t)) return; burst(N, p.x, 140, p.z, { n: 6, speed: [60, 160], up: [40, 140], life: [0.3, 0.5], size: [30, 50], color: [0xc8c8d0, 0x5a5a66], alpha: [0.5, 0], tile: TILE.smoke, drag: 2 }); },
    /** Tráo máu (Đổi Vai): dải sáng nối hai người. */
    swapHp(ev, e) {
      const t = ent(ev.target); if (!t) return; const th = themeOf(e), until = performance.now() + 700;
      sh.chain(() => at(ev.id, 140), () => at(ev.target, 140), { color: th.col, width: 12, life: 0.7, kill: () => performance.now() > until });
      for (const id of [ev.id, ev.target]) { const p = rootOf(id); if (p) { sh.pillar(p.x, p.z, 80, 360, { color: th.col, top: 0xffffff, life: 0.6 }); } }
    },
    /** Áp chế: xích nối người gây và mục tiêu (dây bóng đã có xích riêng của sự kiện tether), vòng ký tự dưới chân mục tiêu, khói tím bốc lên. */
    suppress(ev, e) {
      const t = ent(ev.target); if (!t || (!visible(e) && !visible(t))) return;
      const col = ev.item ? 0xd8a24a : themeOf(e).col, key = ev.id + ':' + ev.target, until = performance.now() + (ev.dur || 1) * 1000 + 150; cutS.delete(key);
      const gone = () => cutS.has(key) || !e?.alive || !t.alive || performance.now() > until;
      if (ev.via !== 'tether') sh.chain(() => at(ev.id, 120), () => at(ev.target, 130), { color: col, width: ev.item ? 11 : 9, life: (ev.dur || 1) + 0.3, kill: gone });
      sh.decal('rune', t.pos.x, t.pos.y, 150, { color: col, life: ev.dur || 1, alpha: 0.7, spin: -2, fadeIn: 0.05 });
      aura(ev.dur || 1, () => { const p = at(ev.target, 60); if (p && Math.random() < 0.5) A.spawn({ x: p.x + R(-35, 35), y: p.y + R(0, 80), z: p.z + R(-35, 35), vy: R(-30, 30), life: 0.45, size: [24, 6], color: [0xf0d8ff, 0x6a3aa8], tile: TILE.smoke, drag: 1 }); }, gone);
    },
    suppressEnd(ev, e) {
      cutS.add(ev.id + ':' + ev.target);
      const t = ent(ev.target), p = t && rootOf(t.id); if (!p || !visible(t)) return;
      if (ev.ok) burst(A, p.x, 140, p.z, { n: 14, speed: [120, 300], up: [40, 220], life: [0.3, 0.6], size: [22, 5], color: [0xfff0c0, themeOf(e).col], tile: TILE.shard, drag: 2 });
      else burst(N, p.x, 130, p.z, { n: 10, speed: [80, 220], up: [20, 160], life: [0.4, 0.7], size: [40, 70], color: [0x6a5a8a, 0x1a1428], alpha: [0.6, 0], tile: TILE.smoke, drag: 2 });
    },
    /** Không thể cản: vòng vàng loé ở chân + vệt vàng bốc lên suốt cửa sổ. */
    unstoppable(ev, e) {
      if (!visible(e)) return; const p = rootOf(e.id); if (!p) return;
      sh.ring(p.x, p.z, 10, 170, { color: 0xffd36a, width: 0.12, life: 0.35 });
      aura(ev.dur || 0.5, () => { const r = rootOf(e.id); if (r && Math.random() < 0.7) A.spawn({ x: r.x + R(-40, 40), y: 20, z: r.z + R(-40, 40), vy: R(220, 380), life: 0.35, size: [18, 4], color: [0xfff6c0, 0xffb030], tile: TILE.streak, drag: 1 }); },
        () => !e.alive || !e.statuses.some((s) => s.id === 'unstoppable'));
    },
    /** Đồ kích hoạt: Sương Đông (kén băng), Lọng Che (vòng + cột sáng; khiên có sự kiện shield riêng), Lụa Gió (vệt lụa). Xích Giữ: sự kiện suppress. */
    itemUse(ev, e) {
      if (!visible(e)) return; const p = rootOf(e.id);
      switch (ev.act) {
        case 'stasis':
          sh.bubble(() => rootOf(e.id), 120, { color: 0xbfefff, life: ev.dur || 2, alpha: 0.9, hex: true, kill: () => !e.alive || !e.statuses.some((s) => s.kind === 'stasis') });
          if (p) burst(A, p.x, 120, p.z, { n: 14, speed: [80, 220], up: [40, 200], life: [0.3, 0.6], size: [22, 5], color: [0xffffff, 0x8fe0ff], tile: TILE.shard, drag: 2 });
          break;
        case 'ward': sh.ring(ev.x, ev.y, 40, ev.radius || 600, { color: 0xffd36a, width: 0.08, life: 0.6, fill: 0.25 }); sh.pillar(ev.x, ev.y, 70, 300, { color: 0xffc860, top: 0xffffff, life: 0.5 }); break;
        case 'dash':
          if (p) { const rot = Math.atan2(ev.dx || 1, (ev.dy || 0) * 0.62); for (let i = 0; i < 6; i++) A.spawn({ x: p.x - (ev.dx || 0) * i * 30, y: 90 + R(-20, 20), z: p.z - (ev.dy || 0) * i * 30, life: 0.25 + i * 0.03, size: [90, 12], color: [0xffffff, 0x9ae8d0], alpha: [0.8, 0], tile: TILE.streak, rot, fadeIn: 0 }); }
          break;
        default: break;
      }
    },
    /** Nội tại bùng (đủ tầng, đổi thế, lên cấp Nghĩa, thoát khống chế…): loé + vòng sáng ở người dùng. */
    proc(ev, e) {
      if (!e || !visible(e)) return; const p = rootOf(e.id); if (!p) return; const th = themeOf(e);
      const big = ev.kind === 'nghia' || ev.kind === 'thau_nhan' || ev.kind === 'canh_seu' || ev.kind === 'chong_chong' || ev.kind === 'thai_cuc';
      sh.ring(p.x, p.z, 10, big ? 260 : 150, { color: th.col, width: 0.12, life: big ? 0.55 : 0.35 });
      burst(A, p.x, 120, p.z, { n: big ? 22 : 10, r: 40, speed: [60, 240], up: [80, 320], life: [0.4, 0.8], size: [24, 6], color: [0xffffff, th.col], tile: TILE.star, drag: 1.5 });
      if (big) sh.pillar(p.x, p.z, 70, 320, { color: th.col, top: 0xffffff, life: 0.5 });
      if (ev.kind === 'chong_chong') { dust(p.x, p.z, 90, 10); const h = headOf(e.id); if (h) burst(A, h.x, h.y, h.z, { n: 10, speed: [120, 260], up: [0, 60], life: [0.4, 0.7], size: [30, 10], color: [0xfff6c0, th.col], tile: TILE.feather, spinR: 14, drag: 2 }); }
    },
  };
}
