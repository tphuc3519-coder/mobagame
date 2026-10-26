// Màn "Nhận thưởng thành công" (07 §11, GĐ4f): nền tối mờ có hạt sáng, tiêu đề lớn giữa trên (đường trang trí hai bên + mũi nhọn ở giữa), hàng ô
// quà căn giữa (tối đa 5 ô / hàng) bật vào lần lượt 120 ms, chạm một ô → bảng nhỏ phía trên (biểu tượng, tên, hiện sở hữu, mô tả, thời hạn),
// dưới cùng thanh bo tròn "Chạm vào khoảng trống để tiếp tục." Dùng chung cho rương, nhiệm vụ, thư, điểm danh, quà mùa, sau trận.
import { icon, fmt } from './kit.js';
import { profile, itemCount, bagList } from './profile.js';
import { CURRENCY, BAG } from '../data/rewards.js';
import { FRAMES, skinLook } from '../data/seasons.js';
import { HEROES } from '../data/heroes/index.js';
import { sfx } from '../audio/audio.js';

/** Một món quà: { k: 'gold'|'gems'|'manh'|'gao'|'exp'|'chest'|'item', id? (k = 'item'), n }. */
const INFO = {
  exp: { name: 'Kinh nghiệm', icon: 'bolt', desc: 'Kinh nghiệm tài khoản — đủ thì lên cấp.' },
  chest: { name: 'Rương Đèn', icon: 'chest', desc: 'Mở ở Túi đồ: vàng, Mảnh Tướng, có thể ra Bùa Giữ Sao.' },
};
export function rewardInfo(r) {
  if (r.k === 'item') return BAG[r.id];
  if (r.k === 'frame') return { name: FRAMES[r.id]?.name || 'Khung ảnh', icon: 'trophy', desc: 'Khung ảnh đại diện — đổi ở Xếp hạng → Mùa giải.' };
  if (r.k === 'skin') return { name: `Trang phục mùa ${skinLook(r.season || 1).name} · ${HEROES[r.id]?.name || ''}`, icon: 'star', desc: 'Phối màu riêng của mùa cho tướng này — bật / tắt ở Xếp hạng → Mùa giải.' };
  return CURRENCY[r.k] || INFO[r.k] || { name: r.k, icon: 'star', desc: '' };
}
function owned(r) {
  const p = profile();
  if (r.k === 'item') return itemCount(r.id);
  if (r.k === 'chest') return p.chests || 0;
  if (r.k === 'frame') return (p.frames || []).filter((f) => f.id === r.id).length;
  if (r.k === 'skin') return (p.skins || []).filter((s) => s.hero === r.id).length;
  if (r.k === 'exp') return null;
  return p[r.k] ?? null;
}
const left = (exp) => { const ms = exp - Date.now(), h = Math.floor(ms / 3600000); return h >= 48 ? `${Math.floor(h / 24)} ngày` : h >= 1 ? `${h} giờ` : `${Math.max(1, Math.ceil(ms / 60000))} phút`; };

const CSS = `
#rewardScr { position: absolute; inset: 0; z-index: 45; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4vh; padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: radial-gradient(60% 60% at 50% 45%, rgba(40,32,80,.93), rgba(3,4,14,.98)); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: rwIn .25s ease-out; overflow: hidden; }
#rewardScr .sp { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(2px 2px at 12% 30%, #ffe7a8, transparent), radial-gradient(1.5px 1.5px at 78% 22%, #fff, transparent),
  radial-gradient(2px 2px at 34% 72%, #ffd06a, transparent), radial-gradient(1.5px 1.5px at 64% 80%, #bfe3ff, transparent), radial-gradient(2.5px 2.5px at 88% 58%, #ffe7a8, transparent), radial-gradient(1.5px 1.5px at 22% 86%, #fff, transparent);
  animation: rwTw 3.2s ease-in-out infinite alternate; opacity: .8; }
#rewardScr h2 { position: relative; display: flex; align-items: center; gap: 14px; margin: 0; font: 800 italic clamp(26px, 5.4vh, 44px)/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; }
#rewardScr h2::before, #rewardScr h2::after { content: ''; width: clamp(60px, 16vw, 200px); height: 2px; background: linear-gradient(90deg, rgba(255,214,140,0), #ffd68c); }
#rewardScr h2::after { transform: scaleX(-1); }
#rewardScr h2 i { position: absolute; left: 50%; bottom: -14px; width: 10px; height: 10px; transform: translateX(-50%) rotate(45deg); background: #ffd68c; box-shadow: 0 0 10px #ffb84a; }
#rewardScr .rw { display: grid; grid-template-columns: repeat(var(--cols), clamp(78px, 15vh, 112px)); gap: clamp(10px, 2.4vh, 18px); justify-content: center; }
#rewardScr .tl { position: relative; aspect-ratio: 1; display: grid; place-items: center; border-radius: 12px; cursor: pointer; padding: 0; border: 0;
  background: radial-gradient(70% 70% at 50% 35%, rgba(255,214,140,.22), rgba(20,26,64,.92)), #141a40; box-shadow: inset 0 0 0 2px rgba(255,214,140,.55), 0 6px 16px rgba(0,0,0,.45);
  animation: rwPop .42s cubic-bezier(.2,.9,.3,1.35) both; animation-delay: calc(var(--i) * 120ms); }
#rewardScr .tl img.ui-ic { width: 58%; height: 58%; filter: drop-shadow(0 3px 4px rgba(0,0,0,.6)); }
#rewardScr .tl b { position: absolute; right: 7px; bottom: 5px; font: 800 italic 17px/1 var(--u-disp); color: #fff; text-shadow: 0 1px 0 #000, 0 0 6px rgba(0,0,0,.8); }
#rewardScr .tl em { position: absolute; left: 0; right: 0; top: -9px; margin: auto; width: max-content; padding: 1px 7px; border-radius: 8px; font: 700 10px/1.5 var(--u-body); font-style: normal; color: #1c1206; background: #ffc85a; }
#rewardScr .tl.on { box-shadow: inset 0 0 0 2px #ffe7a8, 0 0 18px rgba(255,200,90,.6); }
#rewardScr .tip { position: absolute; z-index: 2; width: min(260px, 70vw); padding: 10px 12px; text-align: left; border-radius: 10px; background: rgba(8,10,30,.97); box-shadow: inset 0 0 0 1px rgba(255,214,140,.5), 0 8px 22px rgba(0,0,0,.6); font-size: 13px; color: #dfe6ff; line-height: 1.45; pointer-events: none; }
#rewardScr .tip h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font: 800 15px/1.2 var(--u-body); color: #ffe08a; } #rewardScr .tip h4 img { width: 22px; height: 22px; }
#rewardScr .tip small { display: block; color: #9fb0d8; } #rewardScr .tip .x { color: #ffb070; font-weight: 700; }
#rewardScr .go { padding: 9px 26px; border-radius: 22px; font-size: 14px; color: #dfe6ff; background: rgba(255,255,255,.08); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); animation: rwIn .4s ease-out both; animation-delay: calc(var(--n) * 120ms + 300ms); }
@keyframes rwIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes rwPop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: none; } }
@keyframes rwTw { from { opacity: .45; } to { opacity: .95; } }
@media (prefers-reduced-motion: reduce) { #rewardScr, #rewardScr .tl, #rewardScr .go, #rewardScr .sp { animation: none; } }`;
let styled = false;

/**
 * Hiện màn nhận thưởng. list: [{ k, id?, n }] (gộp sẵn hoặc không — món trùng được cộng lại). o: { title, onDone }.
 * Trả về hàm đóng. Danh sách rỗng thì gọi onDone ngay.
 */
export function showRewards(list, o = {}) {
  const items = [];
  for (const r of list || []) { if (!r || !(r.n > 0)) continue; const same = items.find((x) => x.k === r.k && x.id === r.id); if (same) same.n += r.n; else items.push({ ...r }); }
  if (!items.length) { o.onDone?.(); return () => {}; }
  if (!styled) { styled = true; const st = document.createElement('style'); st.textContent = CSS; document.head.append(st); }
  document.getElementById('rewardScr')?.remove();
  const el = document.createElement('div'); el.id = 'rewardScr'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', o.title || 'Nhận thưởng thành công');
  const cols = Math.min(5, items.length);
  el.innerHTML = `<i class="sp"></i><h2><span class="gt">${o.title || 'Nhận thưởng thành công'}</span><i></i></h2>
    <div class="rw" style="--cols:${cols}">${items.map((r, i) => { const inf = rewardInfo(r), timed = r.k === 'item' && (BAG[r.id]?.ttl || BAG[r.id]?.season);
      return `<button type="button" class="tl" style="--i:${i}" data-i="${i}" aria-label="${inf.name} ${r.n}">${timed ? '<em>Có hạn</em>' : ''}${icon(inf.icon)}<b>${fmt(r.n)}</b></button>`; }).join('')}</div>
    <div class="go" style="--n:${items.length}">Chạm vào khoảng trống để tiếp tục.</div>`;
  document.getElementById('ui').append(el);
  sfx('ui_reward');
  let tip = null;
  const hideTip = () => { tip?.remove(); tip = null; el.querySelectorAll('.tl.on').forEach((t) => t.classList.remove('on')); };
  const close = () => { hideTip(); el.remove(); o.onDone?.(); };
  el.onclick = (e) => {
    const t = e.target.closest('.tl');
    if (!t) { close(); return; }
    const was = t.classList.contains('on'); hideTip(); if (was) return;
    const r = items[+t.dataset.i], inf = rewardInfo(r), own = owned(r), bl = r.k === 'item' ? bagList().find((x) => x.id === r.id) : null;
    tip = document.createElement('div'); tip.className = 'tip';
    tip.innerHTML = `<h4>${icon(inf.icon)}${inf.name}</h4>${own != null ? `<small>Hiện sở hữu: ${fmt(own)}</small>` : ''}<div>${inf.desc || ''}</div>${bl?.exp ? `<div class="x">Có hạn · còn ${left(bl.exp)}</div>` : ''}`;
    el.append(tip); t.classList.add('on');
    const tr = t.getBoundingClientRect(), er = el.getBoundingClientRect(), z = parseFloat(getComputedStyle(el).zoom) || 1;
    const w = tip.offsetWidth, h = tip.offsetHeight, x = (tr.left + tr.width / 2 - er.left) / z, y = (tr.top - er.top) / z;
    tip.style.left = `${Math.max(8, Math.min(er.width / z - w - 8, x - w / 2))}px`; tip.style.top = `${Math.max(8, y - h - 10)}px`;
  }; // tiếng chạm ô: bộ nghe chung ở #ui (audio/uiSounds.js)
  window.__rewards = { items, close };
  return close;
}
