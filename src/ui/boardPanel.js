// Thẻ "Top 100" của bảng Xếp hạng (GĐ4c — 08 §1): Điểm Hào Quang của mình (n/2000 tới danh hiệu), hạng trên bảng khu 100 người chơi ảo
// (cố định theo seed mùa), điểm người thứ 100, Thiên Hà = Thái Dương lọt top 50.
import { face, rankBadge } from './kit.js';
import { profile, rankNow } from './profile.js';
import { boardView } from './haoQuang.js';
import { HQ, BOARD } from '../data/haoQuang.js';
import { SUN, GALAXY } from '../data/ranks.js';
import { seasonAt } from '../data/seasons.js';

const STYLE = `.tb-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin: 0 2px 10px; } .tb-head b { font: 800 italic 24px/1 var(--u-disp); letter-spacing: .03em; color: var(--u-gc); } .tb-head small { color: #a8b4d8; font-size: 13px; }
.tb-me { position: sticky; top: 0; z-index: 2; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; padding: 10px 12px; margin-bottom: 10px; border-radius: 6px; background: linear-gradient(90deg, #3a2870, #12143a); box-shadow: inset 0 0 0 1px rgba(184,138,255,.4), 0 6px 14px rgba(0,0,0,.55); } /* dính trên đầu khi cuộn: luôn thấy điểm + hạng của mình */
@media (max-height: 460px) { .tb-me { padding: 6px 10px; gap: 10px; } .tb-me b { font-size: 18px; } .tb-me .rkb { width: 40px !important; height: 40px !important; } }
.tb-me > div { flex: 1; min-width: 180px; } .tb-me b { display: block; font: 800 italic 22px/1.1 var(--u-disp); letter-spacing: .03em; color: #fff0c8; } .tb-me small { display: block; font-size: 12.5px; color: #c8c4f0; }
.tb-me .pbar { margin-top: 6px; height: 6px; } .tb-me .gal { color: #d8b8ff; font-weight: 700; }
.tb-list .pn-row { padding: 5px 10px; margin-bottom: 5px; gap: 10px; } .tb-list .pn-row .face { width: 34px; height: 34px; } .tb-list .pn-row b { font-size: 14.5px; }
.tb-list .no { flex: none; width: 34px; text-align: center; font: 800 italic 17px/1 var(--u-disp); color: #aeb8de; } .tb-list .g .no { color: #d8b8ff; }
.tb-list .hq { flex: none; min-width: 58px; text-align: right; font: 700 16px/1 var(--u-disp); color: #ffe08a; }
.tb-list .me { box-shadow: inset 0 0 0 2px var(--u-gold), 0 0 12px rgba(255,190,80,.45); } .tb-cut { margin: 10px 2px 6px; font-size: 12px; color: #a8b4d8; text-align: center; }`;
let styled = false;
const SUN_R = { id: SUN.id, name: SUN.name }, GAL_R = { id: GALAXY.id, name: GALAXY.name };

export function boardHtml() {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); }
  const p = profile(), r = rankNow(), V = boardView(p, { name: p.name, avatar: p.avatar });
  const head = p.hq == null
    ? `<div class="tb-me">${rankBadge(r, 52)}<div><b>Chưa có Điểm Hào Quang</b><small>Đạt Nguyệt Quang để nhận ${HQ.start} điểm và lên bảng khu. Thắng +15 + (điểm trận − 8), thua −15 + (điểm trận − 8)/2, tối đa ±${HQ.cap} mỗi trận.</small></div></div>`
    : `<div class="tb-me">${rankBadge(r, 52)}<div><b>Hào Quang ${p.hq}${p.hq < HQ.title ? `/${HQ.title}` : ''}</b>
        <small>${p.hqTitle === p.season ? `Danh hiệu <span class="gal">${HQ.titleName}</span> mùa này` : p.hq >= HQ.title ? `Đủ ${HQ.title} điểm — nhận danh hiệu ${HQ.titleName} sau trận hạng kế tiếp` : `Đạt ${HQ.title} điểm: danh hiệu ${HQ.titleName} + khung ảnh mùa`}</small>
        ${p.hq < HQ.title ? `<span class="pbar"><i style="width:${Math.min(100, (p.hq / HQ.title) * 100)}%"></i></span>` : ''}</div>
      <div><b>${V.pos <= BOARD.n ? `Hạng ${V.pos}` : 'Ngoài top 100'}</b><small>Người thứ 100: ${V.cut} điểm</small>
        <small>${r.id === GALAXY.id ? `<span class="gal">Đang ở Thiên Hà</span>` : V.pos <= BOARD.galaxy ? `Đủ điểm Thiên Hà — cần lên ${SUN.name}` : `Thiên Hà: ${SUN.name} trong top ${BOARD.galaxy}`}</small></div></div>`;
  const rows = V.rows.map((x, i) => {
    const g = i < BOARD.galaxy, rk = x.me ? r : g ? GAL_R : SUN_R;
    return `<div class="pn-row ${x.me ? 'me' : ''} ${g ? 'g' : ''}"><span class="no">${i + 1}</span>${face(x.avatar)}<div><b>${x.name}${x.me ? ' (bạn)' : ''}</b></div>${rankBadge(rk, 30)}<span class="hq">${x.hq}</span></div>`;
  }).join('');
  return `<div class="tb-head"><b>Top 100 khu</b><small>Mùa ${seasonAt().name} · ${BOARD.galaxy} hạng đầu (từ ${SUN.name}) là ${GALAXY.name}</small></div>${head}<div class="tb-list">${rows}</div>
    ${V.pos == null || V.pos > BOARD.n ? `<p class="tb-cut">Cần trên ${V.cut} điểm Hào Quang để vào top 100</p>` : ''}`;
}
