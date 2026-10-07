// Sau trận — 3 màn như Liên Quân, chạm để chuyển:
// A. Đội: CHIẾN THẮNG / THẤT BẠI, tướng mình đứng giữa, 4 đồng đội hai bên (tên người chơi "[Máy]", điểm, MVP).
// B. Cá nhân: tướng bên trái, điểm đánh giá (thang 16) + MVP, Hạ / Chết / Hỗ trợ, danh hiệu, 4 huy chương (Vàng tổng, Hạ, Chịu ST,
//    Gây ST — vàng/bạc/đồng theo thứ hạng trong 10 người), các phần cộng thành điểm, phần thưởng (vàng, kinh nghiệm, sao hạng, điểm tích luỹ).
// C. Bảng tỉ số: kết quả + tỉ số hạ gục hai đội, thời lượng, ngày giờ; thẻ Giản lược / Chi tiết; Số liệu (cách tính điểm từng người),
//    Sảnh, Đấu lại.
import { HEROES } from '../data/heroes/index.js';
import { itemIcon } from '../hud/icons.js';
import { ICON, face, cardSrc, fullSrc, panel, rankBadge, stars } from './kit.js';
import { titleOf, medalOf, kfmt, PARTS } from './score.js';
import { COURAGE_MAX } from './profile.js';

const STYLE = `
#pg { position: absolute; inset: 0; pointer-events: auto; overflow: hidden; background: #070b1e; }
#pg .bg { position: absolute; inset: -30px; background: url(./assets/ui/keyart.jpg) center / cover; filter: blur(12px) brightness(.45) saturate(1.15); }
#pg.win .bg::after, #pg.lose .bg::after { content: ''; position: absolute; inset: 0; } #pg.win .bg::after { background: radial-gradient(70% 70% at 50% 40%, #ffb84a33, #0000 70%), linear-gradient(0deg, #05061ae0, #05061a00 45%); }
#pg.lose .bg::after { background: radial-gradient(70% 70% at 50% 40%, #4f6aa833, #0000 70%), linear-gradient(0deg, #05061ae0, #05061a00 45%); }
#pg .tap { position: absolute; left: 50%; bottom: max(8px, env(safe-area-inset-bottom)); transform: translateX(-50%); margin: 0; font: 600 13px 'Be Vietnam Pro', system-ui; color: #f3f0e6aa; animation: tapb 1.6s ease-in-out infinite; pointer-events: none; } @keyframes tapb { 50% { opacity: .35; } }
#pg .res { position: absolute; left: 0; right: 0; top: max(4px, env(safe-area-inset-top)); text-align: center; pointer-events: none; }
#pg .res b { display: block; font: italic 900 clamp(34px, 12vh, 64px)/1 'Be Vietnam Pro', system-ui; letter-spacing: .08em; } #pg .res small { font: 800 clamp(10px, 3vh, 13px) 'Be Vietnam Pro', system-ui; letter-spacing: .5em; opacity: .8; }
#pg.win .res b { color: #ffd36a; text-shadow: 0 0 26px #ffb84a, 0 3px 0 #7a3b12; } #pg.lose .res b { color: #d4dcf4; text-shadow: 0 0 20px #4f6aa8, 0 3px 0 #1a2040; }
#pg .in { animation: pgIn .5s backwards cubic-bezier(.2,.8,.3,1); } @keyframes pgIn { from { opacity: 0; transform: translateY(24px) scale(.96); } }
#pg .mvp { display: inline-grid; place-items: center; padding: 1px 7px; border-radius: 6px; font: italic 900 11px 'Be Vietnam Pro', system-ui; color: #3a1c00; background: linear-gradient(180deg, #fff3b8, #ffc83a); box-shadow: 0 0 10px #ffb84a99; }
#pg .mvp.silver { background: linear-gradient(180deg, #ffffff, #b8c4dc); color: #1a2440; box-shadow: 0 0 10px #c8d4f499; }
/* A */
#pg .team { position: absolute; left: 0; right: 0; bottom: clamp(26px, 8vh, 40px); top: clamp(84px, 25vh, 130px); display: flex; justify-content: center; align-items: flex-end; gap: clamp(6px, 1.4vw, 16px); }
#pg .ban { position: relative; width: clamp(78px, 13vw, 140px); height: 78%; border-radius: 6px; overflow: hidden; border: 2px solid #8fb8ff66; background: #13204a; box-shadow: 0 8px 20px #000a; display: flex; flex-direction: column; justify-content: flex-end; }
#pg .ban img.hcard { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 18%; }
#pg .ban::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, #060a1cf4 0, #060a1c00 50%); }
#pg .ban > div { position: relative; z-index: 1; padding: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; }
#pg .ban b { font: 800 clamp(11px, 3.4vh, 14px) 'Be Vietnam Pro', system-ui; color: #9fd8ff; } #pg .ban small { font-size: clamp(9px, 2.8vh, 12px); color: #fff; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
#pg .ban .sc { font: 900 clamp(14px, 4.4vh, 20px) 'Be Vietnam Pro', system-ui; color: #fff; display: flex; gap: 4px; align-items: center; }
#pg .hero { position: relative; height: 100%; width: clamp(150px, 26vw, 300px); display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
#pg .hero img.full { position: absolute; left: 50%; bottom: clamp(30px, 9vh, 48px); height: 100%; transform: translateX(-50%); object-fit: contain; filter: drop-shadow(0 0 18px #ffd27a66); pointer-events: none; }
#pg .hero .nm { position: relative; z-index: 1; padding: 4px 16px; border-radius: 16px; background: linear-gradient(90deg, #5a3a10e6, #2a1a08e6); border: 1px solid #ffd27a; font: 800 clamp(12px, 3.8vh, 16px) 'Be Vietnam Pro', system-ui; color: #ffe8a8; display: flex; gap: 8px; align-items: center; white-space: nowrap; }
/* B */
#pg .self { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(150px, 34%) 1fr; align-items: center; gap: 2vw; padding: max(8px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) clamp(24px, 7vh, 34px) max(10px, env(safe-area-inset-left)); box-sizing: border-box; }
#pg .self .art { position: relative; height: 100%; } #pg .self .art img { position: absolute; left: 50%; bottom: 0; height: 100%; transform: translateX(-50%); object-fit: contain; filter: drop-shadow(0 0 20px #ffd27a55); }
#pg .self .st { display: flex; flex-direction: column; gap: clamp(4px, 1.6vh, 10px); min-width: 0; }
#pg .score { display: flex; align-items: baseline; gap: 14px; } #pg .score b { font: italic 900 clamp(46px, 17vh, 90px)/.9 'Be Vietnam Pro', system-ui; color: #fff; text-shadow: 0 0 24px #ffb84a99, 0 3px 0 #7a3b12; }
#pg .score .lbl { display: flex; flex-direction: column; gap: 4px; font: 700 12px 'Be Vietnam Pro', system-ui; color: #ffd28a; } #pg .score .mvp { font-size: 16px; padding: 3px 12px; }
#pg .kda { display: flex; gap: clamp(10px, 2.4vw, 24px); font: 900 clamp(18px, 6vh, 28px) 'Be Vietnam Pro', system-ui; } #pg .kda span { display: flex; flex-direction: column; align-items: center; } #pg .kda small { font: 700 11px 'Be Vietnam Pro', system-ui; color: #a8b4d8; } #pg .kda .k { color: #9fe8ff; } #pg .kda .d { color: #ff9a8a; } #pg .kda .a { color: #b8ffcc; }
#pg .ttl { display: inline-flex; flex-direction: column; align-self: flex-start; padding: 5px 16px; border-radius: 6px; background: linear-gradient(90deg, #6a3a0acc, #2a180800); border-left: 3px solid #ffd27a; } #pg .ttl b { font: italic 900 clamp(15px, 5vh, 22px) 'Be Vietnam Pro', system-ui; color: #ffe08a; } #pg .ttl small { font-size: 12px; color: #f3e9d6; }
#pg .meds { display: flex; gap: clamp(10px, 2.2vw, 22px); }
#pg .md { display: flex; flex-direction: column; align-items: center; gap: 2px; width: clamp(58px, 9vw, 84px); }
#pg .md i { width: clamp(38px, 11vh, 54px); height: clamp(38px, 11vh, 54px); border-radius: 50%; display: grid; place-items: center; padding: 8px; box-sizing: border-box; background: radial-gradient(circle at 50% 35%, #3a4470, #141a36); border: 3px solid #5a6488; }
#pg .md.gold i { border-color: #ffd36a; box-shadow: 0 0 14px #ffb84a; background: radial-gradient(circle at 50% 35%, #8a5a10, #3a2404); } #pg .md.silver i { border-color: #dfe8f8; box-shadow: 0 0 10px #c8d4f4aa; background: radial-gradient(circle at 50% 35%, #5a6a8a, #20283e); } #pg .md.bronze i { border-color: #d89a6a; box-shadow: 0 0 8px #c98a5a99; background: radial-gradient(circle at 50% 35%, #6a3e22, #2a160a); }
#pg .md i svg { width: 100%; height: 100%; } #pg .md b { font: 900 clamp(12px, 4vh, 16px) 'Be Vietnam Pro', system-ui; } #pg .md small { font-size: 11px; color: #a8b4d8; white-space: nowrap; }
#pg .parts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px 10px; max-width: 620px; } #pg .parts div { font-size: 11px; color: #c8d0ea; display: flex; flex-direction: column; } #pg .parts i { height: 4px; border-radius: 2px; background: #ffffff1a; overflow: hidden; margin-top: 2px; } #pg .parts i b { display: block; height: 100%; background: linear-gradient(90deg, #f0c868, #fff3c8); }
#pg .rw { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; } #pg .rw > span { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 15px; background: #0b1230d0; border: 1px solid #ffffff22; font: 800 13px 'Be Vietnam Pro', system-ui; } #pg .rw svg { width: 20px; height: 20px; }
#pg .rw .up { color: #7dffa8; } #pg .rw .down { color: #ff8a7a; } #pg .rw .rkb { width: 26px; height: 26px; } #pg .rw .note { font-size: 12px; color: #ffe08a; font-weight: 600; }
#pg .cg { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #c8d0ea; } #pg .cg i { width: 120px; height: 6px; border-radius: 3px; background: #ffffff1a; overflow: hidden; } #pg .cg i b { display: block; height: 100%; background: linear-gradient(90deg, #ff8a3a, #ffe08a); }
/* C */
#pg .board { position: absolute; inset: 0; display: flex; flex-direction: column; padding: max(6px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); box-sizing: border-box; gap: 6px; background: #070b1ee8; }
#pg .bh { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
#pg .bh .r { font: italic 900 clamp(22px, 7vh, 34px) 'Be Vietnam Pro', system-ui; letter-spacing: .06em; } #pg.win .bh .r { color: #ffd36a; text-shadow: 0 0 14px #ffb84a; } #pg.lose .bh .r { color: #c8d0e8; }
#pg .bh .vs { display: flex; gap: 12px; align-items: center; font: 900 clamp(22px, 7vh, 34px) 'Be Vietnam Pro', system-ui; } #pg .bh .vs .b { color: #6fc8ff; } #pg .bh .vs .rd { color: #ff7a6a; } #pg .bh .vs em { font: italic 900 14px 'Be Vietnam Pro', system-ui; color: #ffe08a; }
#pg .bh .tm { text-align: right; font-size: 12px; color: #c8d0ea; display: flex; flex-direction: column; } #pg .bh .tm b { font-size: 16px; color: #fff; }
#pg .tabs { display: flex; gap: 6px; } #pg .tabs button { height: 30px; padding: 0 16px; border-radius: 15px; border: 1px solid #8fb8ff55; background: #0b1a44; font: 700 13px 'Be Vietnam Pro', system-ui; } #pg .tabs button.on { background: #ffd27a; color: #3a1c00; border-color: #fff3b0; }
#pg .cols { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; overflow: auto; }
#pg .col { display: flex; flex-direction: column; gap: 4px; }
#pg .pr { display: grid; grid-template-columns: clamp(30px, 9vh, 40px) minmax(0, 1.3fr) 54px minmax(0, 1.4fr) 62px 46px; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 6px; background: linear-gradient(90deg, #12306acc, #0b1a4466); border: 1px solid #8fd3ff22; font-size: 12px; }
#pg .col.foe .pr { background: linear-gradient(90deg, #5a1a1acc, #3a0a0a66); border-color: #ff8a7a22; } #pg .pr.me { border-color: #ffd27a; box-shadow: inset 0 0 0 1px #ffd27a66; }
#pg .pr .face, #pg .pr .ini { width: clamp(30px, 9vh, 40px); height: clamp(30px, 9vh, 40px); border-radius: 6px; }
#pg .pr .hn { display: flex; flex-direction: column; min-width: 0; } #pg .pr .hn b { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pg .pr .hn small { font-size: 10px; color: #a8c4ff; }
#pg .pr .sc { display: flex; flex-direction: column; align-items: center; font: 900 15px 'Be Vietnam Pro', system-ui; } #pg .pr .sc .mvp { font-size: 9px; padding: 0 4px; }
#pg .pr .pn { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #e8ecff; } #pg .pr.me .pn { color: #ffe08a; font-weight: 800; }
#pg .pr .kd { font-weight: 800; text-align: center; white-space: nowrap; } #pg .pr .g { color: #ffe08a; font-weight: 800; text-align: right; }
#pg .pr.det { grid-template-columns: clamp(30px, 9vh, 40px) repeat(5, minmax(0, 1fr)) minmax(0, 2fr); gap: 4px; } #pg .pr.det .v { text-align: center; font-weight: 700; } #pg .pr.det .v small { display: block; font-size: 9px; color: #a8b4d8; font-weight: 600; }
#pg .its { display: flex; gap: 2px; } #pg .its .ic { width: 18px; height: 18px; border-radius: 4px; overflow: hidden; display: block; background: #0006; } #pg .its .ic img, #pg .its .ic svg { width: 100%; height: 100%; display: block; }
#pg .bb { display: flex; justify-content: flex-end; gap: 10px; } #pg .bb .btn-gold { height: 44px; font-size: 17px; min-width: 150px; }
.pg-tab { width: 100%; border-collapse: collapse; font-size: 12px; } .pg-tab th, .pg-tab td { padding: 5px 6px; text-align: center; border-bottom: 1px solid #ffffff12; white-space: nowrap; } .pg-tab th { color: #ffd28a; font-weight: 700; } .pg-tab td:first-child, .pg-tab th:first-child { text-align: left; }
.pg-tab tr.me td { color: #ffe08a; font-weight: 800; } .pg-tab tr.t1 td:first-child { color: #ff9a8a; } .pg-tab tr.t0 td:first-child { color: #9fd8ff; } .pg-tab .tot { font-weight: 900; color: #fff; }
.pg-how { font-size: 12px; line-height: 1.6; color: #c8d0ea; } .pg-how b { color: #ffe08a; }
@media (max-height: 400px) { #pg .self .st { gap: 3px; } #pg .score b { font-size: 40px; } #pg .ttl small { display: none; } #pg .md i { width: 34px; height: 34px; padding: 6px; } #pg .md small { font-size: 10px; }
  #pg .parts { gap: 1px 8px; } #pg .parts div { font-size: 10px; } #pg .rw > span { height: 26px; font-size: 12px; } #pg .tap { display: none; } }
@media (max-width: 760px) { #pg .pr { grid-template-columns: 30px 46px minmax(0, 1fr) 54px 40px; } #pg .pr .hn { display: none; } #pg .pr.det { grid-template-columns: 30px repeat(5, minmax(0, 1fr)); } #pg .pr.det .its { display: none; } }
`;
let styled = false;
const css = () => { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); };

const MED_ICON = {
  gold: () => ICON.coin(), k: () => ICON.swords(),
  taken: () => '<svg viewBox="0 0 24 24"><path d="M12 2.5l8 3.2v5.6c0 5-3.4 8.8-8 10.2-4.6-1.4-8-5.2-8-10.2V5.7z" fill="#e8c47a" stroke="#3a2608" stroke-width=".8"/><path d="M12 6l4.6 1.9v3.4c0 3-2 5.3-4.6 6.2z" fill="#fff3c8" opacity=".55"/></svg>',
  dmg: () => '<svg viewBox="0 0 24 24"><path d="M12 2c1 3.6 5.5 5.7 5.5 11a5.5 5.5 0 01-11 0c0-2.6 1.3-4.2 2.6-5.6.2 1.8 1 2.8 2.2 3.2C10.8 7.6 11 4.8 12 2z" fill="#ff8a3a" stroke="#5a1a00" stroke-width=".8"/><path d="M12 12.5c.6 1.6 2.5 2.4 2.5 4.4a2.5 2.5 0 01-5 0c0-1.3.9-2.2 1.6-2.8.2.8.5 1 .9 1.2z" fill="#ffe08a"/></svg>',
};
const fmtDur = (ticks) => { const s = Math.floor(ticks / 30); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const mvpChip = (r) => (r.mvp ? `<span class="mvp ${r.mvp === 'silver' ? 'silver' : ''}">MVP</span>` : '');

/**
 * o: { rows (scoreMatch), myId, myTeam, winner, names: { id → tên hiển thị }, ticks, mode, modeName, rewards (applyResult), onHome, onAgain }
 */
export function openPostgame(o) {
  css();
  const { rows, myTeam, winner } = o, win = winner === myTeam, me = rows.find((r) => r.id === o.myId);
  const mine = rows.filter((r) => r.team === myTeam), theirs = rows.filter((r) => r.team !== myTeam);
  const nameOf = (r) => o.names[r.id] || HEROES[r.heroId].name;
  const ui = document.getElementById('ui'); ui.hidden = false;
  const el = document.createElement('div'); el.id = 'pg'; el.className = 'scr ' + (win ? 'win' : 'lose');
  ui.append(el);
  const res = `<div class="res in"><b>${win ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</b><small>${win ? 'VICTORY' : 'DEFEAT'}</small></div>`;
  let step = 0, tab = 'sum';

  const screenA = () => {
    const al = mine.filter((r) => r !== me);
    const ban = (r, i) => `<div class="ban in" style="animation-delay:${0.1 + i * 0.08}s;height:${i === 1 || i === 2 ? 74 : 66}%"><img class="hcard" src="${cardSrc(r.heroId)}" alt="" draggable="false"><div><b>${HEROES[r.heroId].name}</b><small>${nameOf(r)}</small><span class="sc">${r.score.toFixed(1)} ${mvpChip(r)}</span></div></div>`;
    const hero = `<div class="hero in"><img class="full" src="${fullSrc(me.heroId)}" alt="" draggable="false"><span class="nm">${nameOf(me)} · ${me.score.toFixed(1)} ${mvpChip(me)}</span></div>`;
    const left = al.slice(0, 2).map((r, i) => ban(r, i)).join(''), right = al.slice(2).map((r, i) => ban(r, i + 2)).join('');
    el.innerHTML = `<div class="bg"></div>${res}<div class="team">${left}${hero}${right}</div><p class="tap">Ấn để tiếp tục</p>`;
  };
  const screenB = () => {
    const t = titleOf(me, rows), rw = o.rewards || {};
    const med = (k, label, v) => `<div class="md ${medalOf(me, rows, k)}"><i>${MED_ICON[k]()}</i><b>${v}</b><small>${label}</small></div>`;
    const parts = PARTS.map(([k, n, max]) => `<div>${n} ${me.parts[k].toFixed(1)}/${max}<i><b style="width:${Math.round((me.parts[k] / max) * 100)}%"></b></i></div>`).join('');
    let rank = '';
    if (o.mode === 'ranked' && rw.rankAfter) {
      const d = rw.stars, cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
      rank = `<span>${rankBadge(rw.rankAfter, 26)}${rw.rankAfter.name} <i class="stars">${stars(rw.rankAfter)}</i> <em class="${cls}">${d > 0 ? `+${d} sao` : d < 0 ? `${d} sao` : 'giữ sao'}</em></span>`;
    }
    const notes = (rw.notes || []).map((n) => `<span class="note">${n}</span>`).join('');
    const cg = rw.courage ? `<div class="cg">Điểm tích luỹ +${rw.courage.gain}<i><b style="width:${Math.round((rw.courage.now / COURAGE_MAX) * 100)}%"></b></i>${rw.courage.now}/${COURAGE_MAX}</div>` : '';
    const reward = o.mode === 'training' ? '<span>Luyện tập: không tính thưởng</span>'
      : `<span>${ICON.coin()}+${rw.gold || 0}</span><span>${ICON.star()}+${rw.exp || 0} KN${rw.levelUp ? ` · <em class="up">Lên cấp ${rw.level}!</em>` : ''}</span>${rank}`;
    el.innerHTML = `<div class="bg"></div><div class="self"><div class="art in"><img src="${fullSrc(me.heroId)}" alt="" draggable="false"></div><div class="st">
      <div class="score in"><b>${me.score.toFixed(1)}</b><span class="lbl">ĐIỂM ĐÁNH GIÁ${mvpChip(me)}<span style="color:#c8d0ea">${win ? 'Chiến thắng' : 'Thất bại'} · ${o.modeName}</span></span></div>
      <div class="kda in" style="animation-delay:.08s"><span class="k">${me.k}<small>Hạ</small></span><span class="d">${me.d}<small>Chết</small></span><span class="a">${me.a}<small>Hỗ trợ</small></span><span>${me.kda.toFixed(1)}<small>KDA</small></span></div>
      <div class="ttl in" style="animation-delay:.16s"><b>&lt;${t.name}&gt;</b><small>${t.desc}</small></div>
      <div class="meds in" style="animation-delay:.24s">${med('gold', 'Vàng tổng', kfmt(me.gold))}${med('k', 'Hạ', me.k)}${med('taken', 'Chịu ST', kfmt(me.taken))}${med('dmg', 'Gây ST', kfmt(me.dmg))}</div>
      <div class="parts in" style="animation-delay:.3s">${parts}</div>
      <div class="rw in" style="animation-delay:.36s">${reward}${notes}</div>${cg}
    </div></div><p class="tap">Ấn để tiếp tục</p>`;
  };
  const row = (r) => {
    const cls = r.id === o.myId ? 'me' : '';
    if (tab === 'det') return `<div class="pr det ${cls}">${face(r.heroId)}<span class="v">${kfmt(r.dmg)}<small>Gây ST</small></span><span class="v">${kfmt(r.taken)}<small>Chịu ST</small></span><span class="v">${kfmt(r.obj)}<small>Mục tiêu</small></span><span class="v">${kfmt(r.heal)}<small>Hồi/khiên</small></span><span class="v">${r.cs}<small>Lính/quái</small></span><span class="its">${r.items.map((id) => itemIcon(id)).join('')}</span></div>`;
    return `<div class="pr ${cls}">${face(r.heroId)}<span class="hn"><b>${HEROES[r.heroId].name}</b><small>Cấp ${r.level}</small></span><span class="sc">${r.score.toFixed(1)}${mvpChip(r)}</span><span class="pn">${nameOf(r)}</span><span class="kd">${r.k}/${r.d}/${r.a}</span><span class="g">${kfmt(r.gold)}</span></div>`;
  };
  const screenC = () => {
    const kills = (rs) => rs.reduce((a, r) => a + r.k, 0), d = new Date();
    const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    el.innerHTML = `<div class="bg"></div><div class="board">
      <div class="bh"><span class="r">${win ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</span><span class="vs"><b class="b">${kills(mine)}</b><em>VS</em><b class="rd">${kills(theirs)}</b></span><span class="tm"><b>${fmtDur(o.ticks)}</b><small>${o.surrender ? o.surrender + ' · ' : ''}${o.modeName} · ${date}</small></span></div>
      <nav class="tabs"><button type="button" data-t="sum" class="${tab === 'sum' ? 'on' : ''}">Giản lược</button><button type="button" data-t="det" class="${tab === 'det' ? 'on' : ''}">Chi tiết</button></nav>
      <div class="cols"><div class="col ally">${mine.map(row).join('')}</div><div class="col foe">${theirs.map(row).join('')}</div></div>
      <div class="bb"><button type="button" class="btn-blue" data-a="stats">Số liệu</button><button type="button" class="btn-blue" data-a="home">Sảnh</button><button type="button" class="btn-gold" data-a="again">Đấu lại</button></div></div>`;
  };
  const stats = () => {
    const { body } = panel({ title: 'Số liệu trận đấu' });
    const tr = (r) => `<tr class="t${r.team === myTeam ? 0 : 1} ${r.id === o.myId ? 'me' : ''}"><td>${HEROES[r.heroId].name} · ${nameOf(r)}</td><td>${r.k}/${r.d}/${r.a}</td><td>${r.kda.toFixed(1)}</td>${PARTS.map(([k]) => `<td>${r.parts[k].toFixed(1)}</td>`).join('')}<td class="tot">${r.score.toFixed(1)}${r.mvp ? ' ★' : ''}</td></tr>`;
    body.innerHTML = `<div style="overflow:auto"><table class="pg-tab"><tr><th>Tướng · người chơi</th><th>H/C/HT</th><th>KDA</th>${PARTS.map(([, n, m]) => `<th>${n}<br><small>/${m}</small></th>`).join('')}<th>Điểm</th></tr>${[...mine, ...theirs].map(tr).join('')}</table></div>
      <div class="pg-how"><p><b>Cách tính điểm trận (0–16):</b> Cơ bản 2 + Giao tranh tối đa 3 (KDA = (Hạ + 0,7 × Hỗ trợ) / Chết, đạt 6 là tối đa) + Tham gia tối đa 3 (góp mặt trong số mạng hạ của đội)
      + Sát thương lên tướng 2 + Chống chịu 1,5 + Kinh tế 1,5 + Mục tiêu (công trình + mục tiêu lớn) 1,5 + Hồi/khiên cho đồng đội 1,5 — năm mục này tính theo tỉ lệ so với người cao nhất đội — + Thắng 1.
      MVP: điểm cao nhất đội thắng (vàng) / đội thua (bạc). KDA trên bảng = (Hạ + Hỗ trợ) / Chết.</p>
      <p><b>Đấu hạng:</b> thắng +1 sao (chuỗi từ 3 trận thắng: +1 sao thưởng, dưới Nguyệt Quang), thua −1 sao. Không mất sao khi: ở Đèn Dầu / Đèn Lồng; dưới Hải Đăng mà đang ở sàn bậc;
      là MVP đội thua và có Bùa Giữ Sao (MVP thua); thanh Điểm tích luỹ đầy (thắng: 10 + điểm trận, thua: điểm trận / 2 — đầy ${COURAGE_MAX} thì thắng được +1 sao, thua được giữ sao).
      <b>Phần thưởng:</b> vàng = (thắng 100 / thua 50) + điểm × 6 + MVP 30 (đấu đơn 70%); kinh nghiệm = (thắng 60 / thua 30) + điểm × 2.</p></div>`;
  };
  const SCREENS = [screenA, screenB, screenC];
  SCREENS[0]();
  el.onclick = (e) => {
    if (step < 2) { step++; SCREENS[step](); return; }
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; screenC(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'stats') stats(); else if (a === 'home') o.onHome(); else if (a === 'again') o.onAgain();
  };
  window.__post = { o, next: () => el.onclick({ target: el }) };
}
