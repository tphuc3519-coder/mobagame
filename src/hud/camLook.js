// Điều khiển góc nhìn (như Liên Quân):
// - Giữ/rê ngón trên bản đồ nhỏ: camera nhảy tới chỗ đó, thả tay thì trượt về tướng.
// - Nút mắt bên phải (trên cụm kỹ năng) hoặc vuốt vùng trống nửa phải màn hình: kéo về hướng nào thì camera lệch về hướng đó
//   (kéo càng xa nhìn càng xa, tối đa ~1 màn hình), thả tay thì về tướng. Vẫn chạy/ra chiêu bằng ngón khác được.
const EYE = '<svg viewBox="0 0 32 32"><path d="M3 16c3.5-5.5 8-8.5 13-8.5S25.5 10.5 29 16c-3.5 5.5-8 8.5-13 8.5S6.5 21.5 3 16z" fill="none" stroke="#f3e9d6" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.6" fill="#ffd27a"/><circle cx="16" cy="16" r="1.9" fill="#1a1200"/></svg>';
const MAX_X = 1700, MAX_Z = 1300; // độ lệch tối đa (đơn vị thế giới) — đủ thấy "đoạn sau" ngoài mép màn hình

export function createCamLook({ minimap, map }) {
  let peek = null; // điểm đang giữ trên bản đồ nhỏ (toạ độ thế giới)
  const drag = { id: null, ox: 0, oy: 0, x: 0, y: 0, R: 110, src: null };

  // --- bản đồ nhỏ ---
  const mm = minimap.canvas;
  const toWorld = (e) => { const r = mm.getBoundingClientRect(); return { x: Math.max(0, Math.min(map.w, (e.clientX - r.left) / r.width * map.w)), z: Math.max(0, Math.min(map.h, (e.clientY - r.top) / r.height * map.h)) }; };
  let mmId = null;
  mm.addEventListener('pointerdown', (e) => { if (mmId !== null) return; mmId = e.pointerId; mm.setPointerCapture?.(e.pointerId); peek = toWorld(e); e.preventDefault(); });
  mm.addEventListener('pointermove', (e) => { if (e.pointerId === mmId) peek = toWorld(e); });
  const mmUp = (e) => { if (e.pointerId === mmId) { mmId = null; peek = null; } };
  mm.addEventListener('pointerup', mmUp); mm.addEventListener('pointercancel', mmUp);

  // --- nút mắt + vuốt vùng trống bên phải ---
  const btn = document.createElement('button');
  btn.id = 'camBtn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Kéo camera'); btn.innerHTML = `<span class="ring"></span><span class="knob">${EYE}</span>`;
  document.body.appendChild(btn);
  const knob = btn.querySelector('.knob');
  const start = (e, src, R) => {
    if (drag.id !== null) return false;
    drag.id = e.pointerId; drag.ox = drag.x = e.clientX; drag.oy = drag.y = e.clientY; drag.R = R; drag.src = src;
    src.setPointerCapture?.(e.pointerId); return true;
  };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (start(e, btn, 90)) btn.classList.add('on'); });
  const world3d = document.getElementById('world');
  // vùng trống nửa phải (chạm trúng nền 3D, không trúng nút nào): vuốt để nhìn
  document.body.addEventListener('pointerdown', (e) => { if (e.target === world3d && e.clientX > innerWidth * 0.5) start(e, document.body, 170); });
  const move = (e) => { if (e.pointerId !== drag.id) return; drag.x = e.clientX; drag.y = e.clientY; };
  const up = (e) => { if (e.pointerId !== drag.id) return; drag.id = null; btn.classList.remove('on'); knob.style.transform = ''; };
  for (const el of [btn, document.body]) { el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); }
  for (const t of ['pointerup', 'pointermove']) btn.addEventListener(t, (e) => e.stopPropagation());
  const reset = () => { drag.id = null; mmId = null; peek = null; btn.classList.remove('on'); knob.style.transform = ''; };
  addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  return {
    /** Đang nhìn chỗ khác? (bản đồ nhỏ hoặc kéo camera) */
    active: () => !!peek || drag.id !== null,
    /** Mục tiêu camera thay cho tướng, hoặc null. px/py: vị trí tướng (đã nội suy). */
    look(px, py) {
      if (peek) return { x: peek.x, z: peek.z, rate: 22 };
      if (drag.id === null) return null;
      let dx = drag.x - drag.ox, dy = drag.y - drag.oy; const l = Math.hypot(dx, dy);
      if (l > drag.R) { dx *= drag.R / l; dy *= drag.R / l; }
      if (drag.src === btn) knob.style.transform = `translate(${dx * 0.5}px, ${dy * 0.5}px)`;
      const k = 1 / drag.R; // hướng màn hình: phải = +x, xuống = +z (camera nhìn từ phía nam)
      return { x: clamp(px + dx * k * MAX_X, 0, map.w), z: clamp(py + dy * k * MAX_Z, 0, map.h), rate: 10 };
    },
  };
}
