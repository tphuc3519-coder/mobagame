// Bảng Cài đặt kiểu Liên Quân (theo ảnh người chơi gửi 14/10): hộp lớn giữa màn — tiêu đề "Cài đặt" vàng + nút X; cột thẻ bên trái
// (Thiết lập đồ hoạ · Điều khiển · Thiết lập giao diện · Thiết lập · Âm thanh · Dữ liệu), nội dung cuộn bên phải gồm: thẻ mức đồ hoạ
// (Ưu tiên độ mượt / Cân bằng / Ưu tiên chất lượng / Tuỳ chỉnh), thanh trượt có nấc kim cương (kéo hoặc chạm), nút tròn chọn một (có
// ghi "(mặc định)"), công tắc gạt. Dùng chung ở sảnh (nút Cài đặt) và trong trận (bánh răng) — trong trận có nút Đầu hàng ở chân hộp.
// Đổi là lưu + áp dụng ngay: đồ hoạ qua onGfx (game.js applyGfx; chi tiết cảnh áp dụng trận sau), các mục khác qua core/prefs.js →
// onPref ở từng phần (điều khiển, HUD, âm thanh…).
import { prefs, setPref, resetPrefs, PREF_DEFAULTS } from '../core/prefs.js';
import { PRESETS, presetOf, saveGfx } from '../render/quality.js';
import { sfx } from '../audio/audio.js';

const TABS = [['gfx', 'Thiết lập đồ hoạ'], ['ctl', 'Điều khiển'], ['ui', 'Thiết lập giao diện'], ['gen', 'Thiết lập'], ['snd', 'Âm thanh'], ['net', 'Dữ liệu']];
const TAB_KEY = 'la.settab';
// "Chất lượng hình ảnh" 5 nấc như Liên Quân = gộp độ nét + bóng đổ + ánh sáng rực + khử răng cưa (mức Thấp/Vừa/Cao cũ là nấc 1/3/5)
const IQ = [
  { scale: 1, shadows: false, bloom: false, aa: 0 }, { scale: 1.25, shadows: false, bloom: true, aa: 0 }, { scale: 1.5, shadows: true, bloom: true, aa: 0 },
  { scale: 2, shadows: true, bloom: true, aa: 0 }, { scale: 2, shadows: true, bloom: true, aa: 4 }];
const iqOf = (g) => IQ.findIndex((l) => Object.keys(l).every((k) => l[k] === g[k]));
const SCALES = [1, 1.25, 1.5, 2], DETAIL = ['low', 'mid', 'high'];
const CARDS = [['low', 'Ưu tiên độ mượt', 'Mượt, tiết kiệm pin'], ['mid', 'Cân bằng', 'Đẹp vừa, mát máy'], ['high', 'Ưu tiên chất lượng', 'Đồ hoạ cao, hao pin'], ['custom', 'Tuỳ chỉnh', 'Chỉnh từng mục bên dưới']];

/** Các dòng của từng thẻ. Dòng: { t: 'cards'|'slider'|'range'|'radio'|'toggle'|'pill'|'sound'|'note'|'button', … get/set }. */
function schema({ g, gfxSet, inMatch, onReset }) {
  const P = (k) => ({ get: () => prefs()[k], set: (v) => setPref(k, v), k });
  const radio = (k, label, opts) => ({ t: 'radio', label, opts, ...P(k) });
  const tog = (k, label, desc = '') => ({ t: 'toggle', label, desc, ...P(k) });
  return {
    gfx: [
      { t: 'cards' },
      { t: 'slider', label: 'Chất lượng hình ảnh', stops: ['Mượt', 'Tầm trung', 'Cao', 'Siêu cao', 'Tối cao'], get: () => iqOf(g), set: (i) => gfxSet(IQ[i]) },
      { t: 'slider', label: 'Chất lượng chi tiết', note: inMatch ? 'cây cỏ, nền đất — áp dụng từ trận sau' : 'cây cỏ, nền đất', stops: ['Mượt', 'Cao', 'Tối cao'], get: () => DETAIL.indexOf(g.detail), set: (i) => gfxSet({ detail: DETAIL[i] }) },
      { t: 'slider', label: 'FPS', stops: ['Tiết kiệm pin', 'Cao'], get: () => (g.fps === 60 ? 1 : 0), set: (i) => gfxSet({ fps: i ? 60 : 30 }) },
      { t: 'slider', label: 'Độ phân giải', stops: ['Thấp', 'Vừa', 'Cao', 'HD'], get: () => SCALES.indexOf(g.scale), set: (i) => gfxSet({ scale: SCALES[i] }) },
      { t: 'toggle', label: 'Bóng đổ nhân vật', get: () => g.shadows, set: (v) => gfxSet({ shadows: v }) },
      { t: 'toggle', label: 'Ánh sáng rực', desc: 'Quầng sáng đèn lồng, trụ, hiệu ứng chiêu', get: () => g.bloom, set: (v) => gfxSet({ bloom: v }) },
      { t: 'toggle', label: 'Khử răng cưa', get: () => g.aa > 0, set: (v) => gfxSet({ aa: v ? 4 : 0 }) },
      { t: 'toggle', label: 'Tự giảm đồ hoạ khi giật', desc: 'Máy không giữ nổi FPS thì tự hạ độ nét / bóng đổ, ổn lại thì nâng lên', get: () => g.auto, set: (v) => gfxSet({ auto: v }) },
      { t: 'note', html: 'Điện thoại còn giật: chọn <b>Ưu tiên độ mượt</b>, FPS <b>Tiết kiệm pin</b> hoặc bật <b>Tự giảm đồ hoạ khi giật</b>.' },
    ],
    ctl: [
      radio('preciseAtk', 'Đóng/Mở đánh thường chính xác', [[true, 'Mở', 'kéo nút Đánh về phía địch để chọn đúng mục tiêu'], [false, 'Đóng']]),
      { t: 'range', label: 'Độ nhạy xoay chiêu', lo: 'Chậm', hi: 'Cao', ...P('aimSens') },
      { t: 'slider', label: 'Camera', stops: ['Tắt', 'Giữ', 'Trượt'], vals: ['off', 'hold', 'slide'], ...P('camMode'), note: 'Giữ: kéo nút mắt để nhìn · Trượt: thêm vuốt vùng trống bên phải' },
      { t: 'range', label: 'Tốc độ camera', lo: 'Thấp', hi: 'Cao', dis: () => prefs().camMode === 'off', ...P('camSpeed') },
      radio('atkMode', 'Chế độ công chỉ định', [['auto', 'Tự đánh', 'một nút Đánh'], ['farm', 'Ăn lính + Đẩy trụ', 'thêm 2 nút nhỏ'], ['manual', 'Tự chọn mục tiêu', 'chạm vào địch để khoá']]),
      radio('targetBy', 'Phương pháp lựa chọn mục tiêu', [['pct', '% máu thấp nhất'], ['hp', 'Máu thấp nhất'], ['near', 'Gần nhất']]),
      radio('flashDir', 'Hướng tốc biến mặc định', [['move', 'Bám theo hướng chạy'], ['skill', 'Bám theo hướng chiêu'], ['enemy', 'Tự động tìm địch']]),
      radio('targetMark', 'Hiển thị mục tiêu chỉ định', [[false, 'Ẩn biểu tượng chỉ định'], [true, 'Hiện biểu tượng chỉ định']]),
      radio('castMode', 'Phương pháp tung chiêu', [['aim', 'Hỗ trợ xoay chiêu'], ['auto', 'Tung chiêu tự nhắm', 'Tân thủ']]),
      radio('aimAt', 'Vị trí xoay chiêu', [['button', 'Định vị thủ công'], ['finger', 'Định vị ngón tay', 'lướt ngón tay']]),
      radio('cancelBy', 'Huỷ chiêu', [['zone', 'Chọn vùng', 'kéo vào ô X'], ['distance', 'Chọn cự ly', 'kéo ra xa']]),
      radio('camAim', 'Góc quay theo định vị', [[false, 'Không đi theo'], [true, 'Đi theo chỉ dẫn']]),
      radio('stick', 'Lệnh di chuyển', [['follow', 'Đi theo'], ['fixed', 'Không theo', 'cố định']]),
      { t: 'button', label: 'Đưa điều khiển về mặc định', text: 'Khôi phục', act: () => onReset(['preciseAtk', 'aimSens', 'camMode', 'camSpeed', 'atkMode', 'targetBy', 'flashDir', 'targetMark', 'castMode', 'aimAt', 'cancelBy', 'camAim', 'stick']) },
    ],
    ui: [
      radio('shop', 'Vị trí cửa hàng', [['left', 'Trái', 'dưới bản đồ nhỏ'], ['right', 'Phải']]),
      tog('recommend', 'Hiển thị trang bị đề cử', 'Món nên mua tiếp hiện cạnh nút cửa hàng'),
      tog('itemDesc', 'Ẩn/Hiện mô tả trang bị', 'Dòng mô tả công dụng trong cửa hàng'),
      tog('targetInfo', 'Thông số mục tiêu', 'Khung máu + chỉ số của mục tiêu đang đánh'),
      tog('camFrame', 'Khung camera', 'Khung vùng đang nhìn trên bản đồ nhỏ'),
      tog('cdDecimal', 'Thời gian hồi số thập phân', 'Dưới 10 giây hiện 1 chữ số lẻ'),
      tog('ultSplash', 'Hiển thị ảnh tướng tung chiêu', 'Ảnh tướng lướt qua khi tung chiêu cuối'),
      tog('edgeFoes', 'Vị trí tướng địch rìa màn hình', 'Mũi tên + chân dung địch ngoài màn hình (đang thấy trên bản đồ)'),
      { t: 'toggle', label: 'FPS', desc: 'Số khung hình mỗi giây ở góc màn hình', get: () => !!g.showFps, set: (v) => gfxSet({ showFps: v }) },
      tog('skillTips', 'Miêu tả chiêu trong trận', 'Giữ nút chiêu để xem mô tả'),
      tog('skillNames', 'Miêu tả nút chiêu', 'Tên chiêu dưới nút'),
    ],
    gen: [
      { t: 'pill', label: 'Góc camera', opts: [['near', 'Gần'], ['far', 'Xa']], ...P('camDist') },
      { t: 'slider', label: 'Độ sáng', stops: ['Tối', '2 - Tối', 'Đề cử 3', '4 - Sáng', 'Sáng'], vals: [1, 2, 3, 4, 5], ...P('bright') },
      tog('outline', 'Viền', inMatch ? 'Viền sáng quanh nhân vật — áp dụng từ trận sau' : 'Viền sáng quanh nhân vật (mức chi tiết Mượt luôn tắt)'),
      tog('killFx', 'Dùng H.ứng thông báo', 'Bảng hạ gục / chuỗi hạ gục giữa màn hình'),
      tog('fogFx', 'Hiệu ứng sương mù', 'Vùng chưa có tầm nhìn tối đi (địch trong sương vẫn ẩn)'),
      ...(inMatch ? [] : [{ t: 'button', label: 'Dữ liệu người chơi', text: 'Xoá & bắt đầu lại', danger: true, act: 'reset' }]),
    ],
    snd: [
      { t: 'sound', label: 'Âm thanh', sub: 'Nhạc sảnh, âm nền trong trận', k: 'music', kv: 'musicVol' },
      { t: 'sound', label: 'Hiệu ứng âm thanh', sub: 'Đánh, chiêu, giao diện', k: 'sfx', kv: 'sfxVol' },
      tog('announcer', 'Tiếng thông báo trong trận', 'Nhạc báo hạ gục, chuỗi, phá trụ, vào trận'),
      { t: 'note', html: 'iPhone đang gạt nút <b>im lặng</b> (bên hông máy) thì Safari không phát tiếng. Chạm vào màn hình một lần để bật âm thanh.' },
    ],
    net: [
      tog('saveData', 'Tiết kiệm dữ liệu', 'Không tải trước hình 3D các tướng khi đang ở sảnh — chỉ tải tướng trong trận lúc vào trận (đỡ tốn 3G/4G)'),
      { t: 'note', html: 'Trận đấu với máy chạy ngay trên điện thoại: không cần mạng khi đang đấu, chỉ cần khi mở game lần đầu (tải hình, tiếng). Trò chuyện, mic, ping nhanh chưa có vì chưa có chơi trực tuyến.' },
    ],
  };
}

const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const isDef = (row, v) => row.k && PREF_DEFAULTS[row.k] === v;

function rowHtml(row, i, g) {
  const R = `data-r="${i}"`;
  switch (row.t) {
    case 'cards': { const cur = presetOf(g); return `<div class="rw"><div class="cards">${CARDS.map(([k, n, s]) => `<button type="button" class="cd ${cur === k ? 'on' : ''}" ${R} data-v="${k}"><b>${n}</b><small>${s}</small></button>`).join('')}</div></div>`; }
    case 'slider': case 'range': {
      const disc = row.t === 'slider', v = row.get(), n = disc ? row.stops.length : 0;
      const idx = disc ? (row.vals ? row.vals.indexOf(v) : v) : -1, f = disc ? (idx < 0 ? -1 : idx / (n - 1)) : v;
      const marks = disc ? row.stops.map((_, k) => `<b class="st ${idx >= 0 && k <= idx ? 'on' : ''}" style="left:${(k / (n - 1)) * 100}%"></b>`).join('') : '';
      const labels = disc ? row.stops.map((s, k) => `<span class="${k === idx ? 'sel' : ''}" style="left:${(k / (n - 1)) * 100}%">${s}</span>`).join('') : `<span style="left:0">${row.lo}</span><span style="left:100%">${row.hi}</span>`;
      return `<div class="rw inl ${row.dis?.() ? 'dis' : ''}"><span class="lbl">${row.label}${row.note ? `<small>${row.note}</small>` : ''}${disc && idx < 0 ? '<small class="cu">Tuỳ chỉnh</small>' : ''}</span>
        <div class="sl ${disc ? 'disc' : ''}" ${R}><div class="tr"><i class="fl" style="width:${Math.max(0, f) * 100}%"></i>${marks}<i class="kn" style="left:${Math.max(0, f) * 100}%;${f < 0 ? 'opacity:.35' : ''}"></i></div><div class="lb">${labels}</div></div></div>`;
    }
    case 'radio': { const v = row.get(); return `<div class="rw"><h5>${row.label}</h5><div class="opts">${row.opts.map(([ov, n, sub]) => `<button type="button" class="rb ${ov === v ? 'on' : ''}" ${R} data-v="${esc(JSON.stringify(ov))}"><i></i><span>${n}${sub ? ` <small>(${sub})</small>` : ''}${isDef(row, ov) ? ' <em>(mặc định)</em>' : ''}</span></button>`).join('')}</div></div>`; }
    case 'toggle': return `<div class="rw inl"><span class="lbl">${row.label}${row.desc ? `<small>${row.desc}</small>` : ''}</span><button type="button" class="sw ${row.get() ? 'on' : ''}" ${R} aria-pressed="${!!row.get()}" aria-label="${esc(row.label)}"><i></i></button></div>`;
    case 'pill': { const v = row.get(); return `<div class="rw inl"><span class="lbl">${row.label}</span><span class="pill">${row.opts.map(([ov, n]) => `<button type="button" class="${ov === v ? 'on' : ''}" ${R} data-v="${esc(JSON.stringify(ov))}">${n}</button>`).join('')}</span></div>`; }
    case 'sound': {
      const p = prefs(), on = p[row.k], vol = p[row.kv];
      return `<div class="rw inl snd"><span class="lbl">${row.label}<small>${row.sub}</small></span><button type="button" class="sw ${on ? 'on' : ''}" ${R} data-p="on" aria-label="${esc(row.label)}"><i></i></button>
        <span class="vl">Âm lượng</span><div class="sl ${on ? '' : 'dis'}" ${R} data-p="vol"><div class="tr"><i class="fl" style="width:${vol * 100}%"></i><i class="kn" style="left:${vol * 100}%"></i></div><div class="lb"><span style="left:0">Thấp</span><span style="left:100%">Cao</span></div></div></div>`;
    }
    case 'note': return `<p class="note">${row.html}</p>`;
    case 'button': return `<div class="rw inl"><span class="lbl">${row.label}</span><button type="button" class="bt ${row.danger ? 'red' : ''}" ${R}>${row.text}</button></div>`;
    default: return '';
  }
}

let open = null; // một bảng duy nhất

/**
 * Mở bảng Cài đặt. o: { gfx (đối tượng cài đặt đồ hoạ — sửa tại chỗ), onGfx(k) (trong trận: áp dụng ngay), inMatch,
 *   surrender, surrenderAfter (giây), now() (giây trận), onReset() (sảnh: xoá dữ liệu), onClose }. Trả về hàm đóng.
 */
export function openSettings(o = {}) {
  if (open) return open;
  css();
  const g = o.gfx, inMatch = !!o.inMatch;
  const gfxSet = (patch) => { Object.assign(g, patch); g.preset = presetOf(g); saveGfx(g); o.onGfx?.(Object.keys(patch)[0]); if (!inMatch) hint(); };
  const rows = schema({ g, gfxSet, inMatch, onReset: (keys) => { resetPrefs(keys); draw(); } });
  let tab = 'gfx'; try { const t = localStorage.getItem(TAB_KEY); if (rows[t]) tab = t; } catch (_) { /* riêng tư */ }
  const wrap = document.createElement('div'); wrap.className = 'lqs-wrap';
  wrap.innerHTML = `<div class="lqs" role="dialog" aria-label="Cài đặt"><header><h2>Cài đặt</h2><button type="button" class="x" aria-label="Đóng">${X}</button></header>
    <nav>${TABS.map(([k, n]) => `<button type="button" data-tab="${k}">${n}</button>`).join('')}</nav><section class="pane"></section><footer></footer></div>`;
  const box = wrap.firstChild, pane = box.querySelector('.pane'), foot = box.querySelector('footer');
  let hintT = 0; const hint = () => { foot.dataset.hint = 'Đã lưu — áp dụng khi vào trận'; clearTimeout(hintT); hintT = setTimeout(() => { delete foot.dataset.hint; }, 1800); };

  function draw(keepScroll = true) {
    const sc = pane.scrollTop;
    pane.innerHTML = rows[tab].map((r, i) => rowHtml(r, i, g)).join('');
    if (keepScroll) pane.scrollTop = sc;
    box.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  }
  // —— chân hộp (trong trận): Đầu hàng, chạm hai lần trong 5 giây để xác nhận; đấu hạng chỉ từ phút 8 ——
  let armed = 0, surT = 0;
  function drawFoot() {
    if (!o.surrender) { foot.innerHTML = ''; return; }
    const wait = Math.max(0, Math.ceil((o.surrenderAfter || 0) - (o.now?.() || 0)));
    foot.innerHTML = `<button type="button" class="bt big red" data-sur ${wait ? 'disabled' : ''}>${wait ? `Đầu hàng (sau ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')})` : armed ? 'Chạm lần nữa để đầu hàng' : 'Đầu hàng'}</button>`;
  }
  draw(false); drawFoot();
  const tick = o.surrender ? setInterval(drawFoot, 1000) : 0;

  // —— bấm: thẻ, nút chọn, công tắc, thẻ mức đồ hoạ, nút ——
  box.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { if (t.dataset.tab !== tab) { tab = t.dataset.tab; try { localStorage.setItem(TAB_KEY, tab); } catch (_) { /* riêng tư */ } draw(false); pane.scrollTop = 0; sfx('ui_select'); } return; }
    if (e.target.closest('.x')) { close(); return; }
    if (e.target.closest('[data-sur]')) {
      if (armed && performance.now() - armed < 5000) { close(); o.surrender(); return; }
      armed = performance.now(); drawFoot(); sfx('ui_error'); clearTimeout(surT); surT = setTimeout(() => { armed = 0; drawFoot(); }, 5100); return;
    }
    const el = e.target.closest('[data-r]'); if (!el || el.classList.contains('sl')) return;
    const row = rows[tab][+el.dataset.r]; if (!row) return;
    if (row.t === 'cards') { const k = el.dataset.v; if (k !== 'custom' && PRESETS[k]) gfxSet({ ...PRESETS[k] }); }
    else if (row.t === 'radio' || row.t === 'pill') row.set(JSON.parse(el.dataset.v));
    else if (row.t === 'toggle') row.set(!row.get());
    else if (row.t === 'sound') setPref(row.k, !prefs()[row.k]);
    else if (row.t === 'button') { if (row.act === 'reset') { o.onReset?.(); return; } row.act?.(); }
    sfx(row.t === 'toggle' || row.t === 'sound' ? 'ui_toggle' : 'ui_tap'); draw();
  });

  // —— thanh trượt: kéo (giữ ngón) hoặc chạm vào thanh; nấc rời thì bám nấc gần nhất; thả tay mới lưu ——
  let drag = null;
  const valAt = (sl, x) => { const r = sl.querySelector('.tr').getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / (r.width || 1))); };
  function show(sl, f, idx) {
    sl.querySelector('.fl').style.width = f * 100 + '%'; const kn = sl.querySelector('.kn'); kn.style.left = f * 100 + '%'; kn.style.opacity = '';
    if (idx != null) { sl.querySelectorAll('.st').forEach((m, k) => m.classList.toggle('on', k <= idx)); sl.querySelectorAll('.lb span').forEach((s, k) => s.classList.toggle('sel', k === idx)); }
  }
  function slideTo(d, x) {
    const f = valAt(d.sl, x), row = d.row;
    if (row.t === 'slider') { const n = row.stops.length, idx = Math.round(f * (n - 1)); d.v = row.vals ? row.vals[idx] : idx; show(d.sl, idx / (n - 1), idx); }
    else { d.v = Math.round(f * 20) / 20; show(d.sl, d.v); }
  }
  pane.addEventListener('pointerdown', (e) => {
    const sl = e.target.closest('.sl'); if (!sl || drag || sl.classList.contains('dis') || sl.closest('.dis')) return;
    const row = rows[tab][+sl.dataset.r]; if (!row) return;
    e.preventDefault(); sl.setPointerCapture?.(e.pointerId);
    drag = { sl, row, id: e.pointerId, v: null }; slideTo(drag, e.clientX);
  });
  pane.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) slideTo(drag, e.clientX); });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; if (e.type === 'pointercancel' || d.v == null) { draw(); return; }
    if (d.row.t === 'sound') setPref(d.row.kv, d.v); else if (d.row.get() !== d.v) d.row.set(d.v);
    sfx('ui_tick'); draw();
  };
  pane.addEventListener('pointerup', end); pane.addEventListener('pointercancel', end);

  // —— đóng: nút X, chạm nền tối ngoài hộp, phím Esc ——
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  const key = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  // trong trận: chặn chạm lọt xuống cần điều khiển / camera (chúng nghe trên document.body)
  for (const t of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'touchstart']) wrap.addEventListener(t, (e) => e.stopPropagation(), { passive: t !== 'touchstart' });
  document.body.append(wrap); sfx('ui_open');
  function close() {
    if (!open) return; open = null;
    clearInterval(tick); clearTimeout(surT); clearTimeout(hintT); removeEventListener('keydown', key);
    wrap.classList.add('out'); setTimeout(() => wrap.remove(), 160); sfx('ui_back'); o.onClose?.();
  }
  open = close;
  return close;
}
export const settingsOpen = () => !!open;

const STYLE = `
.lqs-wrap { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(4,6,20,.62); animation: lqsIn .16s ease-out; touch-action: none;
  font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #eef1ff; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.lqs-wrap.out { opacity: 0; transition: opacity .15s; }
@keyframes lqsIn { from { opacity: 0; } to { opacity: 1; } }
.lqs { position: relative; display: grid; grid-template-columns: clamp(112px, 22vw, 210px) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(calc(100vw - 2 * max(8px, env(safe-area-inset-left), env(safe-area-inset-right))), 940px); height: min(calc(100vh - 12px), 580px); height: min(calc(100dvh - 12px), 580px);
  background: linear-gradient(160deg, #40479c 0%, #333985 36%, #2a2e70 100%); border: 1px solid #c8a55c; border-radius: 3px;
  box-shadow: 0 12px 44px rgba(0,0,0,.65), inset 0 0 0 1px rgba(255,236,190,.1); overflow: hidden; animation: lqsUp .2s ease-out; }
@keyframes lqsUp { from { transform: translateY(10px) scale(.985); } to { transform: none; } }
.lqs button { font-family: inherit; color: inherit; cursor: pointer; }
.lqs > header { grid-column: 1 / -1; display: flex; align-items: center; height: clamp(40px, 11.5vh, 56px); padding: 0 4px 0 clamp(14px, 3vw, 30px);
  background: linear-gradient(90deg, rgba(255,214,140,.1), rgba(255,214,140,0) 40%), linear-gradient(180deg, rgba(18,20,58,.55), rgba(18,20,58,.1)); border-bottom: 1px solid rgba(200,165,92,.6); }
.lqs > header h2 { flex: 1; margin: 0; font: 600 clamp(18px, 5.4vh, 26px)/1 'Be Vietnam Pro', system-ui, sans-serif; color: #ffe2a0; letter-spacing: .02em; text-shadow: 0 1px 0 #3a2208, 0 0 12px rgba(255,190,90,.25); }
.lqs > header .x { width: clamp(42px, 11vh, 54px); height: clamp(42px, 11vh, 54px); border: 0; background: none; color: #ffc95a; display: grid; place-items: center; padding: 0; }
.lqs > header .x svg { width: 56%; height: 56%; filter: drop-shadow(0 1px 0 #3a2208); }
.lqs nav { grid-row: 2 / 4; background: linear-gradient(180deg, rgba(30,33,84,.85), rgba(26,28,72,.9)); border-right: 1px solid rgba(160,170,255,.14); overflow-y: auto; touch-action: pan-y; overscroll-behavior: contain; }
.lqs nav button { position: relative; display: block; width: 100%; padding: clamp(10px, 3.4vh, 19px) 10px clamp(10px, 3.4vh, 19px) clamp(12px, 2.4vw, 26px); border: 0; background: none; text-align: left;
  font-size: clamp(13px, 3.8vh, 16px); font-weight: 500; line-height: 1.25; color: #d9defc; }
.lqs nav button.on { color: #fff; background: linear-gradient(90deg, rgba(112,122,226,.6), rgba(146,156,255,.32)); }
.lqs nav button.on::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #fff0bc, #e0ac4e 50%, #b8873a); }
.lqs .pane { grid-column: 2; overflow-y: auto; touch-action: pan-y; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 2px clamp(12px, 3vw, 34px) 16px; }
.lqs > footer { grid-column: 2; display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 8px clamp(12px, 3vw, 34px) 10px; border-top: 1px solid rgba(160,170,255,.12); }
.lqs > footer:empty:not([data-hint]) { display: none; }
.lqs > footer[data-hint]::before { content: attr(data-hint); margin-right: auto; font-size: 13px; color: #9fe6b0; }
.lqs .rw { padding: clamp(10px, 3vh, 16px) 0; border-bottom: 1px solid rgba(160,170,255,.14); }
.lqs .rw:last-child { border-bottom: 0; }
.lqs .rw h5 { margin: 0 0 8px; font-size: clamp(14px, 4vh, 17px); font-weight: 600; color: #fff; }
.lqs .rw.inl { display: flex; align-items: center; gap: clamp(10px, 2vw, 18px); flex-wrap: wrap; }
.lqs .rw.inl > .lbl { flex: 1 1 150px; font-size: clamp(14px, 4vh, 17px); font-weight: 500; color: #fff; }
.lqs .lbl small { display: block; margin-top: 2px; font-size: clamp(11px, 3.2vh, 12.5px); font-weight: 400; color: #a5aee0; }
.lqs .lbl small.cu { color: #ffd98a; }
.lqs .rw.dis > .lbl { opacity: .45; }
.lqs .opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 4px 14px; }
.lqs .rb { display: flex; align-items: center; gap: 10px; padding: 5px 0; border: 0; background: none; text-align: left; font-size: clamp(13px, 3.8vh, 15.5px); line-height: 1.3; color: #c3cbf2; }
.lqs .rb i { flex: none; position: relative; width: 28px; height: 28px; border-radius: 50%; background: #1a1d4e; box-shadow: inset 0 2px 5px rgba(0,0,0,.65), 0 0 0 1px rgba(150,160,255,.22); }
.lqs .rb.on { color: #fff; }
.lqs .rb.on i::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff 0, #d6e6ff 40%, #7fa2ff 100%); box-shadow: 0 0 10px #8fb0ff, 0 0 2px #fff; }
.lqs .rb small { font-size: .86em; color: #a5aee0; }
.lqs .rb em { font-style: normal; font-size: .86em; color: #e2b45c; }
.lqs .sw { flex: none; position: relative; width: 58px; height: 30px; border: 0; border-radius: 15px; background: #1a1d4e; box-shadow: inset 0 2px 6px rgba(0,0,0,.65), 0 0 0 1px rgba(150,160,255,.2); padding: 0; }
.lqs .sw i { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #3b4086; box-shadow: 0 1px 3px rgba(0,0,0,.55); transition: left .14s, background .14s; }
.lqs .sw.on { background: linear-gradient(90deg, #3d58c4, #7590ff); }
.lqs .sw.on i { left: 31px; background: radial-gradient(circle at 40% 35%, #fff 0, #d6e6ff 45%, #8fb0ff 100%); box-shadow: 0 0 10px #9fbaff; }
.lqs .sl { position: relative; flex: 1.4 1 220px; padding: 15px 14px 0; touch-action: none; }
.lqs .sl.dis, .lqs .rw.dis .sl { opacity: .38; pointer-events: none; }
.lqs .sl .tr { position: relative; height: 6px; border-radius: 3px; background: #1a1d4e; box-shadow: inset 0 1px 3px rgba(0,0,0,.65); }
.lqs .sl .fl { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; background: linear-gradient(90deg, #6a82e6, #b9c9ff); }
.lqs .sl .st { position: absolute; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; transform: rotate(45deg); background: #3c4290; box-shadow: 0 0 0 1px rgba(0,0,0,.25); }
.lqs .sl .st.on { background: #d4e0ff; }
.lqs .sl .kn { position: absolute; top: 50%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff 0, #d6e4ff 45%, #7f9cf0 100%);
  box-shadow: 0 0 0 3px rgba(36,40,100,.95), 0 0 12px #8fb0ff; }
.lqs .sl .lb { position: relative; height: 20px; margin-top: 12px; font-size: clamp(11px, 3.3vh, 13.5px); color: #b8c0ea; }
.lqs .sl .lb span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.lqs .sl .lb span:first-child { transform: translateX(-14px); } .lqs .sl .lb span:last-child { transform: translateX(calc(-100% + 14px)); }
.lqs .sl .lb span.sel { color: #fff; font-weight: 600; }
.lqs .snd .vl { font-size: clamp(13px, 3.8vh, 15px); color: #fff; }
.lqs .snd .sl { flex: 1 1 160px; }
.lqs .pill { display: inline-flex; border-radius: 5px; overflow: hidden; box-shadow: 0 0 0 1px rgba(150,160,255,.38); }
.lqs .pill button { min-width: 74px; padding: 8px 18px; border: 0; background: #262b6c; color: #c3cbf2; font-size: 15px; font-weight: 600; }
.lqs .pill button.on { background: linear-gradient(180deg, #f6f9ff, #b9ccff); color: #1d2360; }
.lqs .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.lqs .cd { position: relative; min-height: 62px; padding: 10px 11px; border: 1px solid rgba(160,170,255,.3); border-radius: 2px; background: linear-gradient(180deg, #373e90, #2c3178); text-align: left; color: #fff; overflow: hidden; }
.lqs .cd b { display: block; font-size: clamp(13px, 3.8vh, 15.5px); font-weight: 600; line-height: 1.25; }
.lqs .cd small { display: block; margin-top: 3px; font-size: clamp(11px, 3.2vh, 12.5px); color: #a5aee0; }
.lqs .cd.on { border-color: #ffe08a; background: linear-gradient(180deg, #5d66cc, #4952b6); box-shadow: inset 0 0 0 1px #ffe08a, 0 0 14px rgba(255,214,120,.3); }
.lqs .cd.on::after { content: '✓'; position: absolute; right: 0; top: 0; width: 30px; height: 30px; padding: 1px 3px 0 0; box-sizing: border-box; text-align: right; font-size: 13px; font-weight: 800; color: #fff;
  background: linear-gradient(225deg, #5fd66e 0 50%, transparent 50%); }
.lqs .note { margin: 12px 0 2px; font-size: clamp(12px, 3.4vh, 13.5px); line-height: 1.5; color: #aab3e6; }
.lqs .note b { color: #ffe2a0; font-weight: 600; }
.lqs .bt { flex: none; min-width: 120px; height: 38px; padding: 0 18px; border: 1px solid #b9c9ff; border-radius: 2px; background: linear-gradient(180deg, #86a2ff, #4f66d6 60%, #4258c4); color: #fff; font-size: 15px; font-weight: 600; text-shadow: 0 1px 1px rgba(0,0,40,.5); }
.lqs .bt.red { border-color: #ffb3a6; background: linear-gradient(180deg, #ff8f7a, #d4473a 60%, #b8352a); }
.lqs .bt.big { height: 42px; min-width: 170px; font-size: 16px; }
.lqs .bt[disabled] { filter: grayscale(.7) brightness(.75); }
.lqs .bt:active, .lqs .cd:active, .lqs .pill button:active { filter: brightness(.92); transform: translateY(1px); }
@media (max-width: 700px) { .lqs .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-height: 420px) { .lqs .rw { padding: 8px 0; } .lqs .sl { padding-top: 13px; } .lqs .sl .lb { margin-top: 10px; } .lqs .cd { min-height: 54px; padding: 8px 9px; } .lqs .rb i { width: 24px; height: 24px; } }
`;
let styled = false;
function css() { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); }
