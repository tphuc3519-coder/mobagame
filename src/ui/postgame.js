// Sau trận — 3 màn như Liên Quân, chạm để chuyển:
// A. Đội: CHIẾN THẮNG / THẤT BẠI, tướng mình đứng giữa, 4 đồng đội hai bên (tên người chơi "[Máy]", điểm, MVP).
// B. Cá nhân: tướng bên trái, điểm đánh giá (thang 16) + MVP, Hạ / Chết / Hỗ trợ, danh hiệu, 4 huy chương (Vàng tổng, Hạ, Chịu ST,
//    Gây ST — vàng/bạc/đồng theo thứ hạng trong 10 người), các phần cộng thành điểm, phần thưởng (vàng, kinh nghiệm, sao hạng, điểm tích luỹ).
// C. Bảng tỉ số: kết quả + tỉ số hạ gục hai đội, thời lượng, ngày giờ; thẻ Giản lược / Chi tiết; Số liệu (cách tính điểm từng người),
//    Sảnh, Đấu lại.
import { HEROES } from '../data/heroes/index.js';
import { itemIcon } from '../hud/icons.js';
import { icon, face, cardSrc, fullSrc, panel, rankBadge, stars } from './kit.js';
import { titleOf, medalOf, kfmt, PARTS } from './score.js';
import { COURAGE_MAX } from './profile.js';

const STYLE = `
#pg { position: absolute; inset: 0; z-index: 25; pointer-events: auto; overflow: hidden; background: #070b1e; }
#pg .bg { position: absolute; inset: -30px; background: url(./assets/ui/keyart.jpg) center / cover; filter: blur(12px) brightness(.42) saturate(1.15); }
#pg.lose .bg { filter: blur(12px) brightness(.34) saturate(.45); }
#pg .rays { position: absolute; left: 50%; top: 50%; width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax; pointer-events: none; animation: spin 90s linear infinite;
  background: repeating-conic-gradient(rgba(255,206,120,.15) 0deg 4deg, rgba(255,206,120,0) 4deg 12deg); -webkit-mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,.5) 12%, transparent 34%); mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,.5) 12%, transparent 34%); }
#pg.lose .rays { background: repeating-conic-gradient(rgba(150,180,255,.08) 0deg 4deg, rgba(150,180,255,0) 4deg 12deg); }
#pg .glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(60% 55% at 50% 56%, rgba(255,184,74,.26), rgba(255,184,74,0) 70%), linear-gradient(0deg, rgba(5,6,26,.92), rgba(5,6,26,0) 42%); }
#pg.lose .glow { background: radial-gradient(60% 55% at 50% 56%, rgba(90,120,210,.22), rgba(90,120,210,0) 70%), linear-gradient(0deg, rgba(5,6,26,.92), rgba(5,6,26,0) 42%); }
#pg .tap { position: absolute; left: 50%; bottom: max(6px, env(safe-area-inset-bottom)); transform: translateX(-50%); margin: 0; font: 700 13px/1 var(--u-disp); letter-spacing: .2em; text-transform: uppercase; color: rgba(243,240,230,.75); animation: tapb 1.6s ease-in-out infinite; pointer-events: none; z-index: 3; } @keyframes tapb { 50% { opacity: .3; } }
#pg .res { position: absolute; left: 0; right: 0; top: max(4px, env(safe-area-inset-top)); z-index: 2; text-align: center; pointer-events: none; }
#pg .res b { display: inline-block; font: 800 italic clamp(40px, 13.5vh, 74px)/1 var(--u-disp); letter-spacing: .06em; padding: 0 .14em; }
#pg .res small { display: block; margin-top: 2px; font: 700 clamp(11px, 3.2vh, 14px)/1 var(--u-disp); letter-spacing: .6em; color: #fff; opacity: .8; }
#pg .res::after { content: ''; display: block; width: min(440px, 60vw); height: 2px; margin: 6px auto 0; background: var(--u-line); } #pg.lose .res::after { background: linear-gradient(90deg, rgba(150,170,230,0), #9aa8d8 22%, #eef2ff 50%, #9aa8d8 78%, rgba(150,170,230,0)); }
#pg .in { animation: pgIn .5s backwards cubic-bezier(.2,.8,.3,1); } @keyframes pgIn { from { opacity: 0; transform: translateY(24px) scale(.96); } }
#pg .mvp { display: inline-grid; place-items: center; padding: 2px 8px; border-radius: 4px; font: 800 italic 12px/1.1 var(--u-disp); letter-spacing: .06em; color: #3b1a02; background: var(--u-gold); box-shadow: 0 0 0 1px #5a3306, 0 0 10px rgba(255,180,70,.7); }
#pg .mvp.silver { background: var(--u-silver); color: #18203a; box-shadow: 0 0 0 1px #1a2240, 0 0 10px rgba(200,212,244,.6); }
/* A — đội */
#pg .team { position: absolute; left: 0; right: 0; bottom: clamp(26px, 8vh, 40px); top: clamp(86px, 26vh, 136px); display: flex; justify-content: center; align-items: flex-end; gap: clamp(8px, 1.6vw, 18px); }
#pg .ban { width: clamp(80px, 13vw, 142px); display: flex; flex-direction: column; justify-content: flex-end; }
#pg .ban img.hcard { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 18%; border-radius: 4px; }
#pg .ban::after { content: ''; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(0deg, rgba(4,6,20,.96) 0, rgba(4,6,20,.5) 34%, rgba(4,6,20,0) 56%); }
#pg .ban > div { position: relative; z-index: 2; padding: 6px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
#pg .ban b { font: 700 clamp(12px, 3.8vh, 16px)/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; color: #a8dcff; } #pg.lose .ban b { color: #c8d4f4; }
#pg .ban small { font-size: clamp(9px, 2.8vh, 11.5px); color: #fff; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
#pg .ban .sc { display: flex; gap: 5px; align-items: center; font: 800 italic clamp(16px, 5vh, 22px)/1 var(--u-disp); color: #fff; }
#pg .hero { position: relative; height: 100%; width: clamp(160px, 27vw, 310px); display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
#pg .hero::before { content: ''; position: absolute; left: 8%; right: 8%; bottom: clamp(18px, 6vh, 34px); height: 30px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,200,110,.6), rgba(255,200,110,0)); }
#pg.lose .hero::before { background: radial-gradient(closest-side, rgba(140,170,255,.45), rgba(140,170,255,0)); }
#pg .hero img.full { position: absolute; left: 50%; bottom: clamp(30px, 9vh, 48px); height: 104%; transform: translateX(-50%); object-fit: contain; filter: drop-shadow(0 0 20px rgba(255,210,122,.45)); pointer-events: none; }
#pg .plate { position: relative; z-index: 1; display: flex; gap: 8px; align-items: center; padding: 6px 22px; font: 700 clamp(13px, 4vh, 17px)/1 var(--u-disp); letter-spacing: .04em; color: #ffe8a8; white-space: nowrap;
  background: linear-gradient(90deg, rgba(90,56,14,0), rgba(90,56,14,.95) 15%, rgba(90,56,14,.95) 85%, rgba(90,56,14,0)); }
#pg .plate::before, #pg .plate::after { content: ''; position: absolute; left: 0; right: 0; height: 1px; background: var(--u-line); } #pg .plate::before { top: 0; } #pg .plate::after { bottom: 0; }
/* B — cá nhân */
#pg .self { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(150px, 34%) 1fr; align-items: center; gap: 2vw; padding: max(8px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) clamp(24px, 7vh, 34px) max(10px, env(safe-area-inset-left)); box-sizing: border-box; }
#pg .rays.l { left: 19%; top: 56%; }
#pg .self .fig { position: relative; height: 100%; } #pg .self .fig img { position: absolute; left: 50%; bottom: 0; height: 100%; transform: translateX(-50%); object-fit: contain; filter: drop-shadow(0 0 22px rgba(255,210,122,.45)); }
#pg .self .st { position: relative; display: flex; flex-direction: column; gap: clamp(4px, 1.5vh, 9px); min-width: 0; }
#pg .score { display: flex; align-items: center; gap: 14px; } #pg .score > b { font: 800 italic clamp(50px, 18vh, 96px)/.9 var(--u-disp); padding: 0 .08em; }
#pg .score .lbl { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; font: 700 15px/1 var(--u-disp); letter-spacing: .14em; color: var(--u-gc); } #pg .score .lbl em { font: 600 12px var(--u-body); font-style: normal; letter-spacing: 0; color: #c8d0ea; } #pg .score .mvp { font-size: 16px; padding: 3px 12px; }
#pg .kda { display: flex; gap: clamp(14px, 3vw, 30px); } #pg .kda span { display: flex; flex-direction: column; align-items: center; font: 800 italic clamp(22px, 7vh, 32px)/1 var(--u-disp); }
#pg .kda small { margin-top: 3px; font: 700 11px/1 var(--u-disp); letter-spacing: .1em; text-transform: uppercase; color: #a8b4d8; } #pg .kda .k { color: #9fe8ff; } #pg .kda .d { color: #ff9a8a; } #pg .kda .a { color: #b8ffcc; }
#pg .ttl { align-self: flex-start; display: flex; flex-direction: column; gap: 2px; padding: 5px 28px 5px 14px; background: linear-gradient(90deg, rgba(150,90,20,.85), rgba(150,90,20,0)); border-left: 3px solid #ffd36a; }
#pg .ttl b { font: 800 italic clamp(17px, 5.4vh, 24px)/1 var(--u-disp); letter-spacing: .03em; color: #ffe08a; } #pg .ttl small { font-size: 11.5px; color: #f3e9d6; }
#pg .meds { display: flex; gap: clamp(12px, 2.4vw, 24px); }
#pg .md { display: flex; flex-direction: column; align-items: center; gap: 3px; width: clamp(60px, 9vw, 84px); }
#pg .md i { position: relative; width: clamp(40px, 12vh, 56px); height: clamp(40px, 12vh, 56px); border-radius: 50%; display: grid; place-items: center; background: linear-gradient(180deg, #6a7090, #2a3050); box-shadow: 0 4px 8px rgba(0,0,0,.6); }
#pg .md i::before { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: radial-gradient(circle at 50% 35%, #2a3466, #0c1230); } #pg .md i img { position: relative; width: 84%; height: 84%; }
#pg .md.gold i { background: linear-gradient(180deg, #fff3c0, #e0a83e 50%, #8a5a14); box-shadow: 0 0 14px rgba(255,180,70,.75), 0 4px 8px rgba(0,0,0,.6); } #pg .md.gold i::before { background: radial-gradient(circle at 50% 35%, #7a4c12, #2a1604); }
#pg .md.silver i { background: linear-gradient(180deg, #ffffff, #b8c4dc 50%, #5a6888); box-shadow: 0 0 10px rgba(200,212,244,.6), 0 4px 8px rgba(0,0,0,.6); } #pg .md.silver i::before { background: radial-gradient(circle at 50% 35%, #3e4c78, #121a36); }
#pg .md.bronze i { background: linear-gradient(180deg, #ffd8b8, #c8804a 50%, #6a3a18); box-shadow: 0 0 8px rgba(200,128,74,.55), 0 4px 8px rgba(0,0,0,.6); } #pg .md.bronze i::before { background: radial-gradient(circle at 50% 35%, #5e3820, #20100a); }
#pg .md.none i img { filter: grayscale(.7) brightness(.75); }
#pg .md b { font: 700 clamp(14px, 4.4vh, 18px)/1 var(--u-disp); letter-spacing: .02em; } #pg .md small { font-size: 10.5px; color: #a8b4d8; white-space: nowrap; }
#pg .parts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px 12px; max-width: 640px; } #pg .parts div { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #c8d0ea; white-space: nowrap; } #pg .parts .pbar { height: 4px; }
#pg .rw { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
#pg .rw > span { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px 0 6px; border-radius: 15px; background: rgba(4,7,22,.88); box-shadow: inset 0 0 0 1px rgba(255,214,140,.35); font: 700 15px/1 var(--u-disp); letter-spacing: .03em; white-space: nowrap; }
#pg .rw img.ui-ic { width: 28px; height: 28px; margin: -4px 0; } #pg .rw .rkb { width: 32px; height: 32px; margin: -4px 0; } #pg .rw .rkb b { display: none; }
#pg .rw .up { color: #7dffa8; font-style: normal; } #pg .rw .down { color: #ff8a7a; font-style: normal; } #pg .rw em { font-style: normal; } #pg .rw .note { font: 600 12px var(--u-body); color: #ffe08a; padding: 0 4px; }
#pg .cg { display: flex; align-items: center; gap: 8px; font: 700 12px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #ffcf8a; } #pg .cg .pbar { width: 150px; height: 5px; } #pg .cg .pbar > i { background: linear-gradient(90deg, #ff6a2a, #ffc85a 70%, #fff0c0); }
/* C — bảng tỉ số */
#pg .board { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 7px; padding: max(6px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); box-sizing: border-box; background: linear-gradient(180deg, rgba(5,7,24,.84), rgba(5,7,24,.94)); }
#pg .bh { position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding-bottom: 6px; } #pg .bh::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--u-line); opacity: .7; }
#pg .bh .r { justify-self: start; font: 800 italic clamp(26px, 8vh, 40px)/1 var(--u-disp); letter-spacing: .05em; padding-right: .12em; }
#pg .bh .vs { display: flex; gap: 14px; align-items: center; font: 800 italic clamp(28px, 9vh, 44px)/1 var(--u-disp); } #pg .bh .vs .b { color: #6fc8ff; text-shadow: 0 0 12px rgba(80,170,255,.7); } #pg .bh .vs .rd { color: #ff7a6a; text-shadow: 0 0 12px rgba(255,90,74,.6); } #pg .bh .vs em { font: 800 italic 16px var(--u-disp); color: var(--u-gc); }
#pg .bh .tm { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 11.5px; color: #c8d0ea; text-align: right; } #pg .bh .tm b { font: 700 20px/1 var(--u-disp); letter-spacing: .05em; color: #fff; }
#pg .tabs { display: flex; gap: 2px; border-bottom: 1px solid rgba(255,214,140,.18); }
#pg .tabs button { position: relative; height: 32px; padding: 0 16px; border: 0; background: none; font: 700 14px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #aeb8de; }
#pg .tabs button.on { color: var(--u-gc); background: linear-gradient(0deg, rgba(255,214,140,.16), rgba(255,214,140,0)); } #pg .tabs button.on::after { content: ''; position: absolute; left: 8%; right: 8%; bottom: -1px; height: 2px; background: var(--u-line); }
#pg .cols { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; overflow: auto; }
#pg .col { display: flex; flex-direction: column; gap: 5px; }
#pg .pr { position: relative; display: grid; grid-template-columns: clamp(32px, 9.5vh, 42px) minmax(0, 1.3fr) 56px minmax(0, 1.4fr) 62px 54px; align-items: center; gap: 6px; padding: 3px 8px 3px 4px; border-radius: 5px;
  background: linear-gradient(90deg, rgba(30,70,150,.62), rgba(12,26,70,.3)); box-shadow: inset 0 0 0 1px rgba(143,211,255,.2); font-size: 12px; }
#pg .col.foe .pr { background: linear-gradient(90deg, rgba(150,30,30,.62), rgba(60,10,10,.3)); box-shadow: inset 0 0 0 1px rgba(255,138,122,.22); }
#pg .pr.me { background: linear-gradient(90deg, rgba(150,96,24,.72), rgba(60,36,8,.35)); box-shadow: inset 0 0 0 1px rgba(255,214,120,.75), 0 0 10px rgba(255,180,70,.3); }
#pg .pr .face, #pg .pr .ini { width: clamp(32px, 9.5vh, 42px); height: clamp(32px, 9.5vh, 42px); border-radius: 50%; box-shadow: 0 0 0 1.5px rgba(143,211,255,.6); } #pg .col.foe .pr .face { box-shadow: 0 0 0 1.5px rgba(255,138,122,.7); } #pg .pr.me .face { box-shadow: 0 0 0 1.5px #ffd36a; }
#pg .pr .hn { display: flex; flex-direction: column; min-width: 0; } #pg .pr .hn b { font: 700 13.5px/1.1 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pg .pr .hn small { font-size: 10px; color: #a8c4ff; }
#pg .pr .sc { display: flex; flex-direction: column; align-items: center; gap: 2px; font: 800 italic 17px/1 var(--u-disp); } #pg .pr .sc .mvp { font-size: 9px; padding: 1px 4px; }
#pg .pr .pn { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #e8ecff; } #pg .pr.me .pn { color: #ffe08a; font-weight: 700; }
#pg .pr .kd { font: 700 15px/1 var(--u-disp); letter-spacing: .03em; text-align: center; white-space: nowrap; }
#pg .pr .g { display: flex; align-items: center; justify-content: flex-end; gap: 1px; font: 700 14px/1 var(--u-disp); color: #ffe08a; } #pg .pr .g img.ui-ic { width: 18px; height: 18px; }
#pg .pr.det { grid-template-columns: clamp(32px, 9.5vh, 42px) repeat(5, minmax(0, 1fr)) minmax(0, 2fr); gap: 4px; } #pg .pr.det .v { text-align: center; font: 700 14px/1.1 var(--u-disp); } #pg .pr.det .v small { display: block; font: 600 9px var(--u-body); color: #a8b4d8; }
#pg .its { display: flex; gap: 2px; } #pg .its .ic { width: 20px; height: 20px; border-radius: 4px; border-width: 1px; overflow: hidden; display: block; background: rgba(0,0,0,.4); } #pg .its .ic img, #pg .its .ic svg { width: 100%; height: 100%; display: block; }
#pg .bb { display: flex; justify-content: flex-end; gap: 10px; } #pg .bb button { height: 42px; min-width: 116px; font-size: 19px; } #pg .bb .btn-gold { min-width: 160px; }
.pg-tab { width: 100%; border-collapse: collapse; font-size: 12px; } .pg-tab th, .pg-tab td { padding: 6px; text-align: center; border-bottom: 1px solid rgba(255,255,255,.07); white-space: nowrap; }
.pg-tab th { font: 700 12px/1.2 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; color: var(--u-gc); background: rgba(4,6,20,.6); } .pg-tab th small { font-weight: 600; color: #a8b4d8; } .pg-tab td:first-child, .pg-tab th:first-child { text-align: left; }
.pg-tab tr:nth-child(even) td { background: rgba(255,255,255,.025); } .pg-tab tr.me td { color: #ffe08a; font-weight: 800; background: rgba(255,190,90,.1); } .pg-tab tr.t1 td:first-child { color: #ff9a8a; } .pg-tab tr.t0 td:first-child { color: #9fd8ff; } .pg-tab .tot { font: 800 italic 15px var(--u-disp); color: #fff; }
.pg-how { margin-top: 10px; font-size: 12px; line-height: 1.6; color: #c8d0ea; } .pg-how b { color: #ffe08a; }
@media (max-height: 400px) { #pg .self .st { gap: 3px; } #pg .score > b { font-size: 44px; } #pg .ttl small { display: none; } #pg .md i { width: 36px; height: 36px; } #pg .md small { font-size: 10px; }
  #pg .parts { gap: 1px 8px; } #pg .parts div { font-size: 10px; } #pg .rw > span { height: 26px; font-size: 13px; } #pg .tap { display: none; } }
@media (max-width: 760px) { #pg .parts { display: none; } #pg .pr { grid-template-columns: 32px 46px minmax(0, 1fr) 54px 46px; } #pg .pr .hn { display: none; } #pg .pr.det { grid-template-columns: 32px repeat(5, minmax(0, 1fr)); } #pg .pr.det .its { display: none; } }
`;
let styled = false;
const css = () => { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); };

const MED_ICON = { gold: 'coins', k: 'swords', taken: 'helmet', dmg: 'bolt' }; // huy chương: biểu tượng vẽ sẵn trong vòng vàng / bạc / đồng
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
  const res = `<div class="res in"><b class="${win ? 'gt' : 'gs'}">${win ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</b><small>${win ? 'VICTORY' : 'DEFEAT'}</small></div>`;
  const bg = '<div class="bg"></div><div class="rays"></div><div class="glow"></div>';
  let step = 0, tab = 'sum';

  const screenA = () => {
    const al = mine.filter((r) => r !== me);
    const ban = (r, i) => `<div class="ban fr ${win ? 'blue' : 'plain'} in" style="animation-delay:${0.1 + i * 0.08}s;height:${i === 1 || i === 2 ? 74 : 66}%"><img class="hcard" src="${cardSrc(r.heroId)}" alt="" draggable="false"><div><b>${HEROES[r.heroId].name}</b><small>${nameOf(r)}</small><span class="sc">${r.score.toFixed(1)} ${mvpChip(r)}</span></div></div>`;
    const hero = `<div class="hero in"><img class="full" src="${fullSrc(me.heroId)}" alt="" draggable="false"><span class="plate">${nameOf(me)} · ${me.score.toFixed(1)} ${mvpChip(me)}</span></div>`;
    const left = al.slice(0, 2).map((r, i) => ban(r, i)).join(''), right = al.slice(2).map((r, i) => ban(r, i + 2)).join('');
    el.innerHTML = `${bg}${res}<div class="team">${left}${hero}${right}</div><p class="tap">Ấn để tiếp tục</p>`;
  };
  const screenB = () => {
    const t = titleOf(me, rows), rw = o.rewards || {};
    const med = (k, label, v) => `<div class="md ${medalOf(me, rows, k)}"><i>${icon(MED_ICON[k])}</i><b>${v}</b><small>${label}</small></div>`;
    const parts = PARTS.map(([k, n, max]) => `<div>${n} ${me.parts[k].toFixed(1)}/${max}<span class="pbar"><i style="width:${Math.round((me.parts[k] / max) * 100)}%"></i></span></div>`).join('');
    let rank = '';
    if (o.mode === 'ranked' && rw.rankAfter) {
      const d = rw.stars, cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
      rank = `<span>${rankBadge(rw.rankAfter, 32)}${rw.rankAfter.name} <i class="stars">${stars(rw.rankAfter)}</i> <em class="${cls}">${d > 0 ? `+${d} sao` : d < 0 ? `${d} sao` : 'giữ sao'}</em></span>`;
    }
    const notes = (rw.notes || []).map((n) => `<span class="note">${n}</span>`).join('');
    const cg = rw.courage ? `<div class="cg">Điểm tích luỹ +${rw.courage.gain}<span class="pbar"><i style="width:${Math.round((rw.courage.now / COURAGE_MAX) * 100)}%"></i></span>${rw.courage.now}/${COURAGE_MAX}</div>` : '';
    const reward = o.mode === 'training' ? '<span>Luyện tập: không tính thưởng</span>'
      : `<span>${icon('coin')}+${rw.gold || 0}</span><span>${icon('star')}+${rw.exp || 0} KN${rw.levelUp ? ` · <em class="up">Lên cấp ${rw.level}!</em>` : ''}</span>${rank}`;
    el.innerHTML = `${bg.replace('class="rays"', 'class="rays l"')}<div class="self"><div class="fig in"><img src="${fullSrc(me.heroId)}" alt="" draggable="false"></div><div class="st">
      <div class="score in"><b class="${win ? 'gt' : 'gs'}">${me.score.toFixed(1)}</b><span class="lbl">ĐIỂM ĐÁNH GIÁ${mvpChip(me)}<em>${win ? 'Chiến thắng' : 'Thất bại'} · ${o.modeName}</em></span></div>
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
    return `<div class="pr ${cls}">${face(r.heroId)}<span class="hn"><b>${HEROES[r.heroId].name}</b><small>Cấp ${r.level}</small></span><span class="sc">${r.score.toFixed(1)}${mvpChip(r)}</span><span class="pn">${nameOf(r)}</span><span class="kd">${r.k}/${r.d}/${r.a}</span><span class="g">${icon('coin')}${kfmt(r.gold)}</span></div>`;
  };
  const screenC = () => {
    const kills = (rs) => rs.reduce((a, r) => a + r.k, 0), d = new Date();
    const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    el.innerHTML = `<div class="bg"></div><div class="board">
      <div class="bh"><span class="r ${win ? 'gt' : 'gs'}">${win ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</span><span class="vs"><b class="b">${kills(mine)}</b><em>VS</em><b class="rd">${kills(theirs)}</b></span><span class="tm"><b>${fmtDur(o.ticks)}</b><small>${o.surrender ? o.surrender + ' · ' : ''}${o.modeName} · ${date}</small></span></div>
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
