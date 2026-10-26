// Thẻ "Bảng bùa" của bảng Bảng Bùa (05 §7): cột trái danh sách trang (5 trang mẫu + tối đa 10 trang riêng), giữa 3 hàng × 5 ô bùa và tổng
// chỉ số, phải bảng chọn bùa theo màu. Chạm ô → chọn ô (đổi bảng màu theo); chạm lại ô đang chọn → gỡ; chạm bùa → gắn vào ô đang chọn
// rồi nhảy sang ô trống kế tiếp; ×5 → lấp cả hàng. Sửa trang mẫu là tự tạo bản sao. Mọi thay đổi tự lưu (ui/loadout.js).
import { CHARMS, CHARM_COLORS, CHARM_SLOTS, CHARM_PAGE_MAX, CHARM_NAME_MAX, COLOR_INFO, pageLevel } from '../data/charms.js';
import { allPages, pageById, isPreset, editable, newPage, setSlot, fillColor, clearPage, renamePage, deletePage } from './loadout.js';
import { charmIcon, charmLine, pageLines } from './charmArt.js';
import { dialog, toast } from './kit.js';

const MAXLV = CHARM_COLORS.length * CHARM_SLOTS;
const esc = (s) => String(s).replace(/[<>&"]/g, '');
const firstEmpty = (pg, c) => { const i = pg?.[c]?.indexOf(null); return i >= 0 ? i : -1; };

/** Dựng thẻ vào `host`. st = { pageId, sel: {c, i}, pal }, api = { onSelect?(pageId) } — có onSelect thì hiện nút "Dùng trang này". */
export function renderCharmTab(host, st, api = {}) {
  if (!pageById(st.pageId)) st.pageId = 'dps';
  st.sel ||= { c: 'red', i: 0 }; st.pal ||= st.sel.c;
  const draw = () => {
    const pages = allPages(), pg = pageById(st.pageId), lv = pageLevel(pg), custom = !isPreset(st.pageId), lines = pageLines(pg);
    host.innerHTML = `<div id="loCharm" class="lo-charm">
      <aside class="lo-pages">${pages.map((x) => `<button type="button" class="lo-pg ${x.id === st.pageId ? 'on' : ''} ${x.preset ? 'preset' : ''}" data-pg="${x.id}"><b>${esc(x.name)}</b><small>Cấp ${pageLevel(x)}${x.preset ? ' · Mẫu' : ''}</small></button>`).join('')}
        <button type="button" class="lo-pg add" data-a="new" ${pages.length - 5 >= CHARM_PAGE_MAX ? 'disabled' : ''}>+ Trang mới</button></aside>
      <section class="lo-board"><header class="lo-bh"><b class="lo-name">${esc(pg.name)}</b>${custom ? '<button type="button" class="icb" data-a="rename" aria-label="Đổi tên">✎</button>' : '<small style="color:#9aa6c8">Trang mẫu · sửa sẽ tạo bản sao</small>'}<span class="lo-lv">Cấp ${lv}/${MAXLV}</span></header>
        ${CHARM_COLORS.map((c) => `<div class="lo-row" data-c="${c}" style="--cc:${COLOR_INFO[c].hex}"><span class="lo-cl" style="color:${COLOR_INFO[c].hex}">${COLOR_INFO[c].name}<small>${COLOR_INFO[c].sub}</small></span>
          ${pg[c].map((id, i) => `<button type="button" class="lo-slot ${id ? '' : 'empty'} ${st.sel.c === c && st.sel.i === i ? 'on' : ''}" data-c="${c}" data-i="${i}" aria-label="${id ? CHARMS[id].name : 'Ô trống'}">${id ? charmIcon(id) : '+'}</button>`).join('')}</div>`).join('')}
        <div class="lo-sum ${lines.length ? '' : 'none'}">${lines.length ? lines.map((t) => `<span>${t}</span>`).join('') : 'Chưa gắn bùa nào'}</div>
        <div class="lo-act"><button type="button" class="btn-ghost" data-a="copy">Sao chép</button><button type="button" class="btn-ghost" data-a="clear" ${custom ? '' : 'disabled'}>Gỡ hết</button><button type="button" class="btn-ghost" data-a="del" ${custom ? '' : 'disabled'}>Xoá</button>${api.onSelect ? '<button type="button" id="loUse" class="btn-gold" data-a="use">Dùng trang này</button>' : ''}</div></section>
      <aside class="lo-pal"><div class="lo-ctabs">${CHARM_COLORS.map((c) => `<button type="button" data-pc="${c}" class="${st.pal === c ? 'on' : ''}" style="--cc:${COLOR_INFO[c].hex}">${COLOR_INFO[c].name}</button>`).join('')}</div>
        <div class="lo-chs">${Object.keys(CHARMS).filter((id) => CHARMS[id].color === st.pal).map((id) => `<div class="lo-ch" data-ch="${id}" role="button" tabindex="0">${charmIcon(id)}<span><b>${CHARMS[id].name}</b><small>${charmLine(id)}</small></span><button type="button" class="lo-x5" data-fill="${id}" aria-label="Lấp cả hàng">×5</button></div>`).join('')}</div></aside></div>`;
  };
  /** id trang sửa được (trang mẫu → bản sao); hết chỗ thì báo và trả null. */
  const writable = () => {
    const r = editable(st.pageId);
    if (!r.id) { toast(`Đã đủ ${CHARM_PAGE_MAX} trang — xoá bớt để tạo trang mới`); return null; }
    if (r.copied) toast('Đã tạo bản sao từ trang mẫu');
    st.pageId = r.id; return r.id;
  };
  const selectPage = (id) => { st.pageId = id; const pg = pageById(id), c = CHARM_COLORS.find((k) => firstEmpty(pg, k) >= 0) || 'red'; st.sel = { c, i: Math.max(0, firstEmpty(pg, c)) }; st.pal = c; };
  const A = {
    new: () => { const pg = newPage(); if (!pg) { toast(`Đã đủ ${CHARM_PAGE_MAX} trang`); return; } selectPage(pg.id); },
    copy: () => { const pg = newPage(st.pageId); if (!pg) { toast(`Đã đủ ${CHARM_PAGE_MAX} trang — xoá bớt để sao chép`); return; } selectPage(pg.id); toast(`Đã chép thành "${pg.name}"`); },
    clear: () => { if (clearPage(st.pageId)) { st.sel = { c: 'red', i: 0 }; st.pal = 'red'; } },
    del: () => {
      const pg = pageById(st.pageId); if (!pg || isPreset(st.pageId)) return;
      dialog({ title: 'Xoá trang', html: `<p>Xoá trang “${esc(pg.name)}”?</p>`, buttons: [{ text: 'Huỷ' }, { text: 'Xoá', cls: 'gold', on: () => { deletePage(pg.id); selectPage('dps'); draw(); } }] });
    },
    rename: () => {
      const pg = pageById(st.pageId); if (!pg || isPreset(st.pageId)) return;
      const d = dialog({ title: 'Đổi tên trang', html: `<input type="text" maxlength="${CHARM_NAME_MAX}" value="${esc(pg.name)}" aria-label="Tên trang">`, buttons: [{ text: 'Huỷ' }, { text: 'Lưu', cls: 'gold', on: (w) => { renamePage(pg.id, w.querySelector('input').value); draw(); } }] });
      const inp = d.el.querySelector('input'); inp.focus(); inp.select();
    },
    use: () => api.onSelect?.(st.pageId),
  };
  host.onclick = (ev) => {
    const t = ev.target;
    const fill = t.closest('[data-fill]');
    if (fill) { const id = fill.dataset.fill, c = CHARMS[id].color; if (writable()) { fillColor(st.pageId, c, id); st.sel = { c, i: 0 }; } draw(); return; }
    const pgb = t.closest('[data-pg]'); if (pgb) { selectPage(pgb.dataset.pg); draw(); return; }
    const slot = t.closest('.lo-slot');
    if (slot) {
      const c = slot.dataset.c, i = +slot.dataset.i, pg = pageById(st.pageId);
      if (st.sel.c === c && st.sel.i === i && pg[c][i]) { if (writable()) setSlot(st.pageId, c, i, null); } // chạm lại ô đang chọn: gỡ
      else { st.sel = { c, i }; st.pal = c; }
      draw(); return;
    }
    const pc = t.closest('[data-pc]'); if (pc) { st.pal = pc.dataset.pc; draw(); return; }
    const ch = t.closest('[data-ch]');
    if (ch) {
      const id = ch.dataset.ch, c = CHARMS[id].color;
      if (!writable()) { draw(); return; }
      let i = st.sel.c === c ? st.sel.i : firstEmpty(pageById(st.pageId), c); if (i < 0) i = 0;
      setSlot(st.pageId, c, i, id);
      const pg = pageById(st.pageId), nx = pg[c].findIndex((x, k) => k > i && !x), next = nx >= 0 ? nx : firstEmpty(pg, c);
      st.sel = { c, i: next >= 0 ? next : i };
      draw(); return;
    }
    const a = t.closest('[data-a]')?.dataset.a; if (a && A[a]) { A[a](); if (a !== 'del' && a !== 'rename' && a !== 'use') draw(); }
  };
  draw();
  return { draw };
}
