// Kiểu dáng màn cấm/chọn (#draft), nút + hộp thoại chọn vị trí (phòng chờ) và nhãn vị trí ở chọn tướng / đội hình. Tách khỏi css.js
// (đã quá dài); dùng lại các lớp chung của css.js (.scr, .hd, .gt, .btn-*, .hc, keyframes pickP/pickG/seatP).
const CSS = `
#draft { --colw: min(200px, 22vw); --top: clamp(40px, 11vh, 48px); --bar: clamp(46px, 12.5vh, 54px); background: #070a1e; overflow: hidden; }
#draft .dr-bg { position: absolute; inset: -30px; background: #0a1438 url(./assets/ui/keyart.jpg) center / cover; filter: blur(10px) brightness(.4) saturate(1.15); transition: opacity .3s; }
#draft.ph-prep { background: transparent; } #draft.ph-prep .dr-bg { opacity: 0; pointer-events: none; }
#draft .dr-top { position: absolute; left: var(--l); right: var(--r); top: var(--t); height: var(--top); display: grid; grid-template-columns: var(--colw) 1fr var(--colw); gap: 10px; align-items: center; }
#draft .dr-bans { display: flex; gap: 4px; min-width: 0; } #draft .dr-bans.red { justify-content: flex-end; }
#draft .bn { position: relative; flex: none; width: clamp(26px, 8vh, 34px); aspect-ratio: 1; border-radius: 6px; overflow: hidden; box-sizing: border-box; border: 1.5px dashed rgba(150,190,255,.4); background: rgba(6,10,30,.75); }
#draft .bn .face, #draft .bn .ini { width: 100%; height: 100%; filter: grayscale(.85) brightness(.75); }
#draft .bn.x { border-style: solid; border-color: #ff6a5a; }
#draft .bn.x::after { content: ''; position: absolute; inset: 0; background: linear-gradient(45deg, transparent 44%, #ff3a2a 44% 56%, transparent 56%); }
#draft .bn.now { border-color: #ffd36a; animation: drNow 1s ease-in-out infinite; }
#draft .bn.skip { display: grid; place-items: center; color: #8a90a8; font: 700 14px var(--u-disp); }
#draft .dr-turn { display: flex; align-items: center; justify-content: center; gap: 10px; min-width: 0; }
#draft .dr-timer { position: relative; flex: none; width: 44px; height: 44px; display: grid; place-items: center; }
#draft .dr-timer svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
#draft .dr-timer .tr { fill: rgba(4,6,20,.82); stroke: rgba(255,255,255,.12); stroke-width: 5; } #draft .dr-timer .tp { fill: none; stroke: #8fd8ff; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset .22s linear; filter: drop-shadow(0 0 4px #4fa8ff); }
#draft .dr-timer b { position: relative; font: 800 italic 20px/1 var(--u-disp); color: #fff; text-shadow: 0 0 10px #4fa8ff; }
#draft .dr-timer.low .tp { stroke: #ff6a5a; filter: drop-shadow(0 0 4px #ff3a2a); } #draft .dr-timer.low b { color: #ffd8d0; text-shadow: 0 0 10px #ff3a2a; }
#draft .dr-tt { min-width: 0; } #draft .dr-phase { display: inline-block; font: 800 italic clamp(18px, 6vh, 26px)/1 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; padding-right: 4px; white-space: nowrap; }
#draft .dr-who { display: block; margin-top: 2px; font: 600 11px var(--u-body); color: var(--u-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #draft .dr-who.me { color: var(--u-gc); font-weight: 700; }
#draft .dr-col { position: absolute; top: calc(var(--t) + var(--top) + 4px); bottom: var(--b); width: var(--colw); display: flex; flex-direction: column; gap: 4px; }
#draft .dr-col.blue { left: var(--l); } #draft .dr-col.red { right: var(--r); }
#draft .dr-col .hd { margin: 0; flex: none; } #draft .dr-col .hd.foe { color: #ff9a8a; } #draft .dr-col .hd.foe::before { background: linear-gradient(90deg, rgba(255,120,100,0), #ff7a6a); } #draft .dr-col .hd.foe::after { background: linear-gradient(270deg, rgba(255,120,100,0), #ff7a6a); }
#draft .dr-rows { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
#draft .dr-row { position: relative; display: flex; align-items: center; gap: 7px; height: clamp(40px, 11.5vh, 52px); flex: none; padding: 0 6px 0 8px; box-sizing: border-box; border-radius: 5px; background: linear-gradient(90deg, rgba(30,70,150,.55), rgba(12,26,70,.25)); box-shadow: inset 0 0 0 1px rgba(143,211,255,.22); }
#draft .dr-row::before { content: ''; position: absolute; left: 0; top: 5px; bottom: 5px; width: 3px; border-radius: 2px; background: #4fa8ff; }
#draft .red .dr-row { background: linear-gradient(270deg, rgba(150,30,30,.55), rgba(60,10,10,.25)); box-shadow: inset 0 0 0 1px rgba(255,138,122,.28); flex-direction: row-reverse; text-align: right; padding: 0 8px 0 6px; }
#draft .red .dr-row::before { left: auto; right: 0; background: #ff6a5a; }
#draft .dr-row.me { background: linear-gradient(90deg, rgba(150,96,24,.62), rgba(60,36,8,.25)); box-shadow: inset 0 0 0 1px rgba(255,214,120,.55), 0 0 10px rgba(255,180,70,.25); } #draft .dr-row.me::before { background: #ffd36a; }
#draft .dr-row.now { animation: pickP 1.2s ease-in-out infinite; } #draft .dr-row.me.now { animation-name: pickG; }
#draft .dr-row .face, #draft .dr-row .ini, #draft .dr-row .qm { width: clamp(30px, 9vh, 40px); height: clamp(30px, 9vh, 40px); border-radius: 50%; flex: none; box-shadow: 0 0 0 1.5px rgba(143,211,255,.6); }
#draft .red .dr-row .face, #draft .red .dr-row .qm { box-shadow: 0 0 0 1.5px rgba(255,138,122,.7); } #draft .dr-row.me .face, #draft .dr-row.me .ini { box-shadow: 0 0 0 1.5px #ffd36a; }
#draft .dr-row .qm { display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, #2a3666, #10163a); color: #6f8ae8; font: 800 italic 18px var(--u-disp); }
#draft .dr-row .hov { opacity: .45; }
#draft .dr-row > div { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
#draft .red .dr-row > div { align-items: flex-end; }
#draft .dr-row b { max-width: 100%; font: 700 13px/1.1 var(--u-disp); letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#draft .dr-row > div > span { display: flex; align-items: center; gap: 4px; min-width: 0; max-width: 100%; } #draft .red .dr-row > div > span { flex-direction: row-reverse; }
#draft .dr-row small { min-width: 0; font-size: 10px; color: #a8c4ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #draft .dr-row.done small { color: #7dffa8; } #draft .dr-row.me small { color: #ffe08a; }
#draft .dr-mid { position: absolute; left: calc(var(--l) + var(--colw) + 10px); right: calc(var(--r) + var(--colw) + 10px); top: calc(var(--t) + var(--top) + 4px); bottom: calc(var(--b) + var(--bar) + 6px); display: flex; flex-direction: column; gap: 5px; }
#draft .dr-tabs { flex: none; display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; } #draft .dr-tabs::-webkit-scrollbar { display: none; }
#draft .dr-tabs button { flex: none; height: 26px; padding: 0 8px; border: 0; border-radius: 13px; background: rgba(255,255,255,.06); display: inline-flex; align-items: center; gap: 4px; font: 700 12px/1 var(--u-disp); letter-spacing: .03em; color: #aeb8de; }
#draft .dr-tabs button.on { background: linear-gradient(180deg, rgba(255,214,140,.25), rgba(255,214,140,.05)); color: var(--u-gc); box-shadow: inset 0 -2px 0 #f0c060; }
#draft .dr-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(74px, 1fr)); grid-auto-rows: clamp(58px, 17vh, 84px); gap: 6px; align-content: start; padding: 2px; -webkit-overflow-scrolling: touch; }
#draft .hc { position: relative; padding: 0; border: 1.5px solid transparent; border-radius: 5px; overflow: hidden; background: linear-gradient(180deg, #1c2050, #0c0f2a) padding-box, linear-gradient(180deg, rgba(200,214,255,.55), rgba(90,110,170,.3)) border-box; box-shadow: 0 3px 8px rgba(0,0,0,.5); }
#draft .hc img, #draft .hc .ini { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 22%; }
#draft .hc span { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 5px 3px; text-align: left; background: linear-gradient(0deg, rgba(4,5,16,.96) 30%, rgba(4,5,16,0)); }
#draft .hc b { display: block; font: 700 12px/1.05 var(--u-disp); letter-spacing: .02em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #draft .hc small { font-size: 9.5px; color: #cdb8ff; }
#draft .hc.on { background: linear-gradient(180deg, #2a2050, #120c2a) padding-box, var(--u-rim) border-box; box-shadow: 0 0 0 1px rgba(255,214,120,.4), 0 0 14px rgba(255,176,64,.65); }
#draft .hc.hide { display: none; }
#draft .hc.ban { filter: grayscale(1) brightness(.5); }
#draft .hc.ban::after, #draft .hc.ally::after, #draft .hc.mine::after, #draft .hc.foe::after { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.66); font: 700 12px var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #ffcf8a; }
#draft .hc.ban::after { content: 'Bị cấm'; background: linear-gradient(45deg, transparent 46%, rgba(255,58,42,.9) 46% 54%, transparent 54%), rgba(0,0,0,.62); color: #ffb4a4; }
#draft .hc.ally::after { content: 'Đồng đội'; } #draft .hc.mine::after { content: 'Bạn'; color: #ffe08a; } #draft .hc.foe::after { content: 'Đối thủ'; color: #ff9a8a; }
.hc em.rec, #pick .hc em.rec, #draft .hc em.rec { position: absolute; top: 3px; left: 3px; right: auto; padding: 1px 5px; border-radius: 4px; background: var(--u-gold); color: #3b1a02; font: 800 italic 9.5px/1.2 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; }
#draft .dr-bar { position: absolute; left: calc(var(--l) + var(--colw) + 10px); right: calc(var(--r) + var(--colw) + 10px); bottom: var(--b); height: var(--bar); display: flex; align-items: center; gap: 8px; }
#draft .dr-info { flex: 1; min-width: 0; }
#draft .dr-info b { display: block; font: 800 italic clamp(16px, 5.4vh, 22px)/1 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; color: #fff2cc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 3px #000; }
#draft .dr-info small { display: block; margin-top: 3px; font-size: 11px; color: var(--u-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#draft .dr-go { flex: none; width: clamp(120px, 18vw, 170px); height: clamp(40px, 11vh, 48px); padding: 0 10px; font-size: clamp(18px, 5.6vh, 22px); }
#draft .dr-skip { flex: none; height: 32px; padding: 0 12px; font-size: 13px; } #draft .dr-skip[hidden] { display: none; }
#draft .btn-red[disabled] { filter: grayscale(.75) brightness(.6); }
#draft .dr-prep { position: absolute; left: calc(var(--l) + var(--colw) + 10px); right: calc(var(--r) + var(--colw) + 10px); bottom: calc(var(--b) + 4px); display: flex; align-items: center; gap: 10px; justify-content: center; }
#draft:not(.ph-prep) .dr-prep, #draft.ph-prep .dr-mid, #draft.ph-prep .dr-bar { display: none; }
#draft .dr-spell { position: relative; flex: none; width: 46px; height: 46px; padding: 2px; border: 0; border-radius: 50%; background: var(--u-rim); box-shadow: 0 0 0 1px #2a1606, 0 4px 8px rgba(0,0,0,.6); margin-bottom: 12px; }
#draft .dr-spell svg, #draft .dr-spell img, #draft .dr-spell canvas { width: 100%; height: 100%; border-radius: 50%; }
#draft .dr-spell small { position: absolute; left: 50%; top: 100%; margin-top: 2px; transform: translateX(-50%); font: 700 10.5px/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; color: #f3e9d6; text-shadow: 0 1px 2px #000; }
#draft .dr-pill { flex: none; height: 34px; padding: 0 14px; border: 0; border-radius: 17px; background: linear-gradient(180deg, rgba(30,36,80,.92), rgba(8,12,34,.92)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.45), 0 3px 8px rgba(0,0,0,.5); font: 600 12.5px var(--u-body); color: #f3ead2; white-space: nowrap; }
#draft .dr-pill b { font: 700 13px var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: var(--u-gc); margin-right: 6px; }
#draft .dr-ready { flex: none; width: clamp(130px, 20vw, 180px); padding: 0 10px; }
@keyframes drNow { 50% { box-shadow: 0 0 0 1px rgba(255,214,120,.8), 0 0 12px rgba(255,180,70,.7); } }
@media (max-height: 400px) { #draft .dr-row small { display: none; } }

/* —— nhãn vị trí (chọn tướng, cấm chọn, đội hình) —— */
em.rl { display: inline-flex; flex: none; align-items: center; gap: 3px; width: max-content; padding: 1px 6px; border-radius: 8px; background: rgba(0,0,0,.5); font: 700 10px/1.3 var(--u-disp); font-style: normal; letter-spacing: .04em; color: #cfe6ff; white-space: nowrap; }
.rl-ic { width: 12px; height: 12px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pick .tm small em.rl { margin-right: 4px; vertical-align: -2px; display: inline-flex; } #pick .tm.me em.rl { color: #ffe6a8; }
#lineup .lu em.rl { margin-top: 3px; }
/* —— phòng chờ: nút vị trí dưới ô của mình + hộp thoại chọn vị trí —— */
#room .rl-chip { margin-top: 5px; display: inline-flex; align-items: center; gap: 4px; height: 24px; max-width: 128%; padding: 0 9px; box-sizing: border-box; border: 0; border-radius: 12px; overflow: hidden; background: rgba(4,6,20,.85); box-shadow: inset 0 0 0 1px rgba(255,214,140,.55); font: 700 12px/1 var(--u-disp); letter-spacing: .03em; color: var(--u-gc); white-space: nowrap; }
#room .rl-chip .rl-ic { width: 14px; height: 14px; } #room .rl-chip small { font: 600 10px var(--u-body); color: var(--u-dim); overflow: hidden; text-overflow: ellipsis; }
#room .rl-chip.need { animation: seatP 1.2s ease-in-out infinite; }
.rl-dlg .rl-lab { text-align: left; margin: 2px 0 5px; font: 700 12px var(--u-disp); letter-spacing: .1em; text-transform: uppercase; color: var(--u-gc); } .rl-dlg .rl-lab small { font: 500 11px var(--u-body); letter-spacing: 0; text-transform: none; color: var(--u-dim); }
.rl-pick { display: grid; grid-template-columns: repeat(6, minmax(50px, 64px)); gap: 6px; justify-content: center; margin-bottom: 8px; }
.rl-tile { height: 54px; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 0; border-radius: 6px; background: linear-gradient(180deg, rgba(30,40,90,.8), rgba(8,12,34,.9)); box-shadow: inset 0 0 0 1px rgba(150,190,255,.3); font: 700 11.5px/1 var(--u-disp); color: #dfe6ff; }
.rl-tile .rl-ic { width: 22px; height: 22px; } .rl-tile.on { box-shadow: inset 0 0 0 1.5px #ffd36a, 0 0 12px rgba(255,180,70,.5); color: var(--u-gc); background: linear-gradient(180deg, rgba(120,80,20,.7), rgba(40,24,6,.9)); }
.rl-tile[disabled] { opacity: .35; }
.rl-hint { margin: 2px 0 0; min-height: 1.4em; font-size: 11.5px; line-height: 1.35; color: var(--u-dim); }
.rl-got { margin-top: 6px; display: flex; gap: 5px; align-items: center; justify-content: center; color: #fff2cc; } .rl-got .rl-ic { width: 18px; height: 18px; color: var(--u-gc); } .rl-got b { color: var(--u-gc); } .rl-got small { color: var(--u-dim); }
@media (max-height: 420px) { .rl-tile { height: 46px; } .rl-tile .rl-ic { width: 18px; height: 18px; } .ui-dlg .txt:has(.rl-dlg) + .btns { margin-top: 8px; } }
`;

let done = false;
export function injectDraftCss() {
  if (done) return; done = true;
  const s = document.createElement('style'); s.id = 'ui-css-draft'; s.textContent = CSS; document.head.append(s);
}
