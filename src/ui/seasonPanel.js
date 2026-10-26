// Thẻ "Mùa giải" của bảng Xếp hạng (GĐ4b — 08 §4): tên mùa + đếm ngược, bậc hiện tại / cao nhất mùa, 3 vòng tướng thành thạo, trang phục mùa
// (chọn tướng, tiến độ 10/10, bật / tắt), Hành trình đỉnh cao, thưởng hết mùa theo bậc cao nhất + bảng reset mềm, khung ảnh đại diện.
import { icon, face, fmt, rankBadge, dialog, toast } from './kit.js';
import { profile, rankOf, starsAt, journey, claimJourney, chooseSkin, setSkinOn, equipFrame } from './profile.js';
import { masteryRings, skinState } from './season.js';
import { seasonAt, seasonLeft, SEASON_END, SOFT_RESET, MASTERY, SKIN_LOCKED, FRAMES, skinLook } from '../data/seasons.js';
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { BAG } from '../data/rewards.js';
import { showRewards } from './rewards.js';

const STYLE = `.ss-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin: 0 2px 10px; } .ss-head b { font: 800 italic 24px/1 var(--u-disp); letter-spacing: .03em; color: var(--u-gc); } .ss-head small { color: #a8b4d8; font-size: 13px; }
.ss-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; margin-bottom: 12px; }
.ss-card { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 6px; background: linear-gradient(90deg, rgba(30,38,90,.78), rgba(12,16,42,.62)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.16); }
.ss-card > div { flex: 1; min-width: 0; } .ss-card b { display: block; font: 700 16px/1.2 var(--u-disp); letter-spacing: .02em; color: #fff0c8; } .ss-card small { display: block; font-size: 12px; color: #b8c4e8; }
.ss-rings { display: flex; gap: 8px; margin-top: 6px; } .ss-rings i { position: relative; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font: 700 10px var(--u-disp); color: #9fb0d8; box-shadow: inset 0 0 0 2px rgba(160,176,220,.35); overflow: hidden; }
.ss-rings i.done { box-shadow: inset 0 0 0 2px #7dffa8, 0 0 8px rgba(125,255,168,.5); } .ss-rings i .face { position: absolute; inset: 2px; width: calc(100% - 4px); height: calc(100% - 4px); border-radius: 50%; opacity: .85; }
.ss-rings i em { position: absolute; bottom: -1px; left: 0; right: 0; text-align: center; font-style: normal; font: 700 10px/1.2 var(--u-disp); color: #fff; background: rgba(0,0,0,.6); }
.ss-sw { width: 44px; height: 44px; flex: none; border-radius: 10px; display: grid; place-items: center; overflow: hidden; box-shadow: inset 0 0 0 2px rgba(255,255,255,.4); }
.ss-sw .face { width: 100%; height: 100%; mix-blend-mode: multiply; }
.ss-card .go { flex: none; min-width: 92px; height: 34px; padding: 0 12px; font-size: 15px; }
.ss-frames { display: flex; flex-wrap: wrap; gap: 8px; } .ss-frames button { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 17px; border: 0; background: rgba(20,26,64,.9); color: #dfe6ff; font: 700 13px var(--u-body); box-shadow: inset 0 0 0 2px var(--fc); }
.ss-frames button.on { background: var(--fc); color: #10121e; }
.ss-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; color: #cfd6ef; } .ss-tbl td { padding: 4px 6px; border-bottom: 1px solid rgba(255,214,140,.12); } .ss-tbl td:last-child { color: #ffe08a; }
.ss-pick { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; max-height: 50vh; overflow: auto; padding: 4px; } .ss-pick button { padding: 2px; border: 0; border-radius: 50%; background: rgba(160,176,220,.3); aspect-ratio: 1; } .ss-pick button .face { width: 100%; height: 100%; border-radius: 50%; } .ss-pick small { display: block; font-size: 10.5px; color: #cfd6ef; }`;
let styled = false;
const rewText = (r) => [r.gold ? `${fmt(r.gold)} vàng` : '', r.gems ? `${r.gems} ngọc` : '', r.manh ? `${r.manh} Mảnh Tướng` : '', r.item ? BAG[r.item].name : '', r.frame ? FRAMES[r.frame.id || r.frame]?.name : ''].filter(Boolean).join(' + ');
const tierRank = (t) => rankOf(starsAt(t));

export function seasonHtml() {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); }
  const p = profile(), ssn = seasonAt(), r = rankOf(p.stars), peak = rankOf(Math.max(p.seasonPeak || 0, p.stars)), rings = masteryRings(p), sk = skinState(p), look = skinLook(p.season || ssn.n);
  const ringHtml = [0, 1, 2].map((i) => { const x = rings[i]; return `<i class="${x?.done ? 'done' : ''}" title="${x ? HEROES[x.hero]?.name : 'Chưa có'}">${x ? `${face(x.hero)}<em>${x.wins}/${MASTERY.wins}</em>` : `0/${MASTERY.wins}`}</i>`; }).join('');
  const skinBtn = sk.got ? `<button type="button" class="btn-blue go" data-skin-on>${p.skinOn?.[sk.hero] === p.season ? 'Tắt' : 'Bật'}</button>` : `<button type="button" class="btn-gold go" data-skin-pick>${sk.hero ? 'Đổi tướng' : 'Chọn tướng'}</button>`;
  const J = journey(), endR = SEASON_END[Math.min(peak.tier, SEASON_END.length - 1)];
  const frames = p.frames || [];
  return `<div class="ss-head"><b>Mùa ${ssn.name}</b><small>Thời hạn mùa giải: còn ${seasonLeft()}</small></div>
    <div class="ss-grid">
      <div class="ss-card">${rankBadge(r, 56)}<div><b>${r.name}</b><small>Cao nhất mùa: ${peak.name} · thắng hạng ${p.seasonWins || 0} trận</small>
        <div class="ss-rings" title="Tướng thành thạo: ${MASTERY.heroes} tướng × ${MASTERY.wins} trận thắng hạng → ${FRAMES[MASTERY.frame].name}">${ringHtml}</div></div></div>
      <div class="ss-card"><span class="ss-sw" style="background:${look.tint}">${sk.hero ? face(sk.hero) : icon('star')}</span><div><b>Trang phục mùa · ${look.name}</b>
        <small>${sk.got ? `Đã nhận cho ${HEROES[sk.hero]?.name}` : sk.hero ? `${HEROES[sk.hero]?.name} · thắng ${sk.wins}/${sk.need} trận hạng` : `Chọn một tướng, thắng ${sk.need} trận hạng trong mùa để nhận`}</small>
        <span class="pbar"><i style="width:${(sk.wins / sk.need) * 100}%"></i></span></div>${skinBtn}</div>
    </div>
    <h4 class="pn-sub">Hành trình đỉnh cao</h4>
    ${J.map((j) => `<div class="pn-row">${rankBadge(tierRank(j.tier), 40)}<div><b>${tierRank(j.tier).short}</b><small>${rewText(j)}</small></div><button type="button" class="btn-gold go" data-jr="${j.tier}" ${j.open && !j.got ? '' : 'disabled'}>${j.got ? 'Đã nhận' : j.open ? 'Nhận' : 'Chưa mở'}</button></div>`).join('')}
    <h4 class="pn-sub">Thưởng hết mùa</h4>
    <div class="pn-row">${icon('chest')}<div><b>Theo bậc cao nhất mùa: ${peak.short}</b><small>${rewText({ ...endR, frame: endR.frame })} — nhận khi mùa kết thúc</small></div></div>
    <table class="ss-tbl" aria-label="Reset mềm">${SOFT_RESET.map((t, i) => `<tr><td>${tierRank(i).short}</td><td>${t ? `mùa sau bắt đầu ở ${rankOf(starsAt(t[0], t[1])).name}` : 'giữ nguyên'}</td></tr>`).join('')}</table>
    <h4 class="pn-sub">Khung ảnh đại diện</h4>
    <div class="ss-frames">${frames.length ? [{ id: null }, ...frames].map((f) => `<button type="button" data-fr="${f.id || ''}" class="${(p.frame || null) === f.id ? 'on' : ''}" style="--fc:${f.id ? FRAMES[f.id]?.col : '#9fb0d8'}">${f.id ? `${FRAMES[f.id]?.name}${f.season ? ` · S${f.season}` : ''}` : 'Không khung'}</button>`).join('') : '<p class="pn-note" style="margin:0">Chưa có khung — nhận từ thưởng hết mùa, Hành trình đỉnh cao, tướng thành thạo.</p>'}</div>`;
}

/** Bấm trong thẻ Mùa giải. rerender(): vẽ lại thẻ. Trả về true nếu đã xử lý. */
export function seasonClick(e, rerender) {
  const p = profile();
  const jr = e.target.closest('[data-jr]'); if (jr) { const got = claimJourney(+jr.dataset.jr); if (got) showRewards(got, { onDone: rerender }); rerender(); return true; }
  if (e.target.closest('[data-skin-on]')) { setSkinOn(skinState(p).hero, p.season); rerender(); return true; }
  if (e.target.closest('[data-skin-pick]')) { pickSkinHero(rerender); return true; }
  const fr = e.target.closest('[data-fr]'); if (fr) { equipFrame(fr.dataset.fr || null); rerender(); return true; }
  return false;
}

function pickSkinHero(rerender) {
  const ids = ALPHA.filter((h) => !SKIN_LOCKED.includes(h));
  const dlg = dialog({ title: 'Chọn tướng nhận trang phục mùa', html: `<div class="ss-pick">${ids.map((h) => `<button type="button" data-h="${h}" aria-label="${HEROES[h].name}">${face(h)}</button>`).join('')}</div><p style="font-size:12px;color:#a8b4d8">Bốn tướng mang model cao cấp giữ nguyên hình, không có trang phục mùa.</p>`, buttons: [{ text: 'Đóng' }] });
  dlg.el.querySelector('.ss-pick').onclick = (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const r = chooseSkin(b.dataset.h); dlg.close(); rerender();
    if (Array.isArray(r)) showRewards(r, { onDone: rerender }); else if (r) toast(`Trang phục mùa sẽ dành cho ${HEROES[b.dataset.h].name}`);
  };
}
