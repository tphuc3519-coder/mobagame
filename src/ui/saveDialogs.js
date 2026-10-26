// Hộp Xuất / Nhập mã lưu (GĐ4a, Mốc 13): mở từ Cài đặt → Dữ liệu ở sảnh. Mã lưu: ui/save.js.
// Xuất: hiện mã + Sao chép / Tải tệp .txt. Nhập: dán mã hoặc chọn tệp → kiểm mã → xem tóm tắt hồ sơ → xác nhận → ghi các khoá rồi tải lại trang
// (cách chắc nhất để mọi màn đọc lại hồ sơ mới). Hồ sơ đang có được cất ở la.profile.bak trước khi bị thay.
import { dialog, toast, fmt } from './kit.js';
import { profile, saveProfile, rankOf } from './profile.js';
import { encodeSave, decodeSave, SAVE_KEYS } from './save.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let styled = false;
function css() {
  if (styled) return; styled = true;
  const st = document.createElement('style');
  st.textContent = `.ui-dlg .sv { text-align: left; min-width: min(460px, 86vw); }
.ui-dlg .sv textarea { -webkit-user-select: text; user-select: text; width: 100%; height: 96px; box-sizing: border-box; margin: 8px 0 2px; padding: 8px 10px; resize: none;
  border-radius: 6px; border: 1px solid rgba(255,214,140,.5); background: rgba(4,6,20,.9); color: #cfe0ff; font: 500 11px/1.35 ui-monospace, Menlo, monospace; word-break: break-all; outline: none; }
.ui-dlg .sv textarea:focus { box-shadow: 0 0 0 2px rgba(255,190,90,.35); }
.ui-dlg .sv small { color: #9fb0d8; } .ui-dlg .sv .err { color: #ff8a7a; font-weight: 700; min-height: 1.2em; margin: 4px 0 0; }
.ui-dlg .sv dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 6px 0 4px; } .ui-dlg .sv dt { color: #9fb0d8; } .ui-dlg .sv dd { margin: 0; font-weight: 700; }`;
  document.head.append(st);
}
const read = (k) => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && typeof o === 'object' ? o : null; } catch (_) { return null; } };
const dateVi = (t) => { const d = new Date(t); return t ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '—'; };

/** Mã lưu của máy này (ghi hồ sơ đang mở trước cho chắc). */
export function currentCode() {
  saveProfile();
  const data = {}; for (const k of SAVE_KEYS) data[k] = k === 'la.profile' ? profile() : read(k);
  return encodeSave(data);
}

async function copy(text, ta) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* không có quyền / http thường */ }
  try { ta.focus(); ta.select(); return document.execCommand('copy'); } catch (_) { return false; }
}
function download(text) {
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = `lantern-arena-ma-luu-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.txt`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export function openExport() {
  css();
  const code = currentCode();
  const dlg = dialog({
    title: 'Xuất mã lưu',
    html: `<div class="sv"><p>Mã này chứa hồ sơ, hạng, túi đồ, bảng bùa, phù hiệu và cài đặt. Dán vào <b>Cài đặt → Dữ liệu → Nhập mã lưu</b> ở trình duyệt / máy khác để chơi tiếp.</p>
      <textarea readonly spellcheck="false" aria-label="Mã lưu">${esc(code)}</textarea><small>${fmt(code.length)} ký tự</small></div>`,
    buttons: [
      { text: 'Sao chép', cls: 'gold', on: (w) => { copy(code, w.querySelector('textarea')).then((ok) => toast(ok ? 'Đã chép mã lưu' : 'Không chép được — chạm giữ vào ô mã để chép tay')); return false; } },
      { text: 'Tải tệp', on: () => { download(code); toast('Đã tải tệp mã lưu'); return false; } },
      { text: 'Đóng' },
    ],
  });
  return dlg;
}

export function openImport() {
  css();
  const dlg = dialog({
    title: 'Nhập mã lưu',
    html: `<div class="sv"><p>Dán mã lưu (bắt đầu bằng <b>LA1-</b>) hoặc chọn tệp mã lưu đã tải.</p>
      <textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Mã lưu" placeholder="LA1-…"></textarea>
      <input type="file" accept=".txt,text/plain" hidden><p class="err" role="alert"></p></div>`,
    buttons: [
      { text: 'Chọn tệp', on: (w) => { w.querySelector('input[type=file]').click(); return false; } },
      { text: 'Nhập', cls: 'gold', on: (w) => { const r = decodeSave(w.querySelector('textarea').value); if (!r.ok) { w.querySelector('.err').textContent = r.err; return false; } confirmImport(r); return true; } },
      { text: 'Huỷ' },
    ],
  });
  const file = dlg.el.querySelector('input[type=file]');
  file.onchange = () => { const f = file.files?.[0]; if (!f) return; f.text().then((t) => { dlg.el.querySelector('textarea').value = t.trim(); dlg.el.querySelector('.err').textContent = ''; }); };
  return dlg;
}

function confirmImport(r) {
  const p = r.d['la.profile'], rk = rankOf(p.stars || 0);
  return dialog({
    title: 'Thay hồ sơ?',
    html: `<div class="sv"><dl><dt>Tên</dt><dd>${esc(p.name || '—')}</dd><dt>Cấp</dt><dd>${p.level}</dd><dt>Bậc hạng</dt><dd>${esc(rk.name)}</dd>
      <dt>Số trận</dt><dd>${fmt(p.games)} trận · thắng ${fmt(p.wins)}</dd><dt>Mã tạo lúc</dt><dd>${dateVi(r.t)}</dd></dl>
      <p>Hồ sơ đang có trên máy này sẽ được thay bằng hồ sơ trên (bản cũ được cất làm bản sao lưu). Game tải lại sau khi nhập.</p></div>`,
    buttons: [{ text: 'Huỷ' }, { text: 'Nhập và tải lại', cls: 'gold', on: () => { applyImport(r.d); location.reload(); } }],
  });
}

/** Ghi dữ liệu đã kiểm vào máy (hồ sơ cũ cất ở la.profile.bak). Trả về true nếu ghi được. */
export function applyImport(d) {
  try {
    saveProfile(); // hồ sơ đang mở có thể chưa từng được ghi (máy mới) — ghi trước để bản sao lưu là đúng hồ sơ người chơi đang thấy
    const cur = localStorage.getItem('la.profile'); if (cur) localStorage.setItem('la.profile.bak', cur);
    for (const k of SAVE_KEYS) if (d[k]) localStorage.setItem(k, JSON.stringify(d[k]));
    return true;
  } catch (_) { toast('Không ghi được vào máy (chế độ riêng tư?)'); return false; }
}
