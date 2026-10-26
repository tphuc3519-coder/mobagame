// Kiểu dáng bảng Bảng bùa / Phù hiệu (ui/loadoutPanel.js) + hộp chọn trang nhanh ở màn chọn tướng. Nạp một lần khi mở lần đầu
// (css.js đã quá dài). Bố cục giữ vừa màn ngang điện thoại 844×390 (19,5:9) mà không cuộn cả trang: chỉ cột danh sách trang / bảng bùa cuộn.
const CSS = `
.lo-panel .ui-body { display: flex; flex-direction: column; overflow: hidden; padding-top: 10px; }
.lo-tabs { display: flex; gap: 0; border-radius: 18px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,214,140,.45); }
.lo-tabs button { height: 32px; padding: 0 14px; border: 0; background: rgba(8,12,34,.85); font: 700 13px var(--u-disp); letter-spacing: .05em; color: #c8d0ea; text-transform: uppercase; }
.lo-tabs button.on { background: linear-gradient(180deg, #fff1c0, #e8b04a 60%, #a8701e); color: #2a1404; }
.lo-charm { display: grid; grid-template-columns: clamp(124px, 19vw, 190px) minmax(0, 1fr) clamp(170px, 27vw, 250px); gap: 10px; height: 100%; min-height: 0; }
.lo-pages, .lo-chs { overflow-y: auto; -webkit-overflow-scrolling: touch; min-height: 0; }
.lo-pages { display: flex; flex-direction: column; gap: 5px; padding: 2px; }
.lo-pg { flex: none; display: flex; flex-direction: column; justify-content: center; height: 40px; padding: 0 10px; border: 0; border-radius: 7px; text-align: left; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); color: #e8eeff; }
.lo-pg b { font: 700 13px/1.1 var(--u-disp); letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .lo-pg small { font-size: 10.5px; color: #9aa6c8; }
.lo-pg.on { background: linear-gradient(90deg, rgba(255,190,90,.24), rgba(255,190,90,.05)); box-shadow: inset 0 0 0 1.5px rgba(255,214,120,.8); }
.lo-pg.add { align-items: center; color: var(--u-gc); font: 700 13px var(--u-disp); } .lo-pg.add:disabled { opacity: .4; }
.lo-board { --sl: clamp(34px, 10.5vh, 48px); display: flex; flex-direction: column; gap: 6px; min-width: 0; min-height: 0; overflow-y: auto; }
.lo-bh { display: flex; align-items: center; gap: 8px; } .lo-bh .lo-name { font: 800 italic 18px/1.1 var(--u-disp); color: #ffe6a6; letter-spacing: .03em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lo-bh .icb { width: 28px; height: 28px; border: 0; border-radius: 50%; background: rgba(255,255,255,.08); color: #ffe08a; font-size: 14px; }
.lo-bh .lo-lv { margin-left: auto; font: 700 12px var(--u-disp); color: #9ad0ff; white-space: nowrap; }
.lo-row { display: flex; align-items: center; gap: 6px; }
.lo-cl { flex: none; width: 52px; display: flex; flex-direction: column; font: 700 13px/1.05 var(--u-disp); } .lo-cl small { font: 500 9.5px var(--u-body); color: #9aa6c8; }
.lo-slot { flex: none; width: var(--sl); height: var(--sl); padding: 3px; border: 0; border-radius: 50%; background: radial-gradient(circle at 50% 35%, rgba(255,255,255,.12), rgba(0,0,0,.35)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); display: grid; place-items: center; }
.lo-slot.empty { box-shadow: none; border: 1.5px dashed var(--cc, #888); color: var(--cc, #888); font: 700 18px/1 var(--u-disp); }
.lo-slot.on { box-shadow: 0 0 0 2px #ffd36a, 0 0 12px rgba(255,200,90,.6); }
.lo-slot .lo-gem { width: 100%; height: 100%; }
.lo-sum { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 2px 10px; padding: 6px 8px; border-radius: 7px; background: rgba(0,0,0,.28); font-size: 11.5px; color: #cfe6ff; }
.lo-sum.none { color: #8a94b8; }
.lo-act { display: flex; flex-wrap: wrap; gap: 6px; } .lo-act button { height: 34px; padding: 0 12px; font-size: 14px; } .lo-act button:disabled { opacity: .4; }
.lo-pal { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.lo-ctabs { display: flex; gap: 4px; } .lo-ctabs button { flex: 1; height: 30px; border: 0; border-radius: 6px; background: rgba(255,255,255,.06); font: 700 12.5px var(--u-disp); color: var(--cc); }
.lo-ctabs button.on { background: rgba(255,255,255,.16); box-shadow: inset 0 -2px 0 var(--cc); }
.lo-chs { display: flex; flex-direction: column; gap: 4px; padding: 1px; }
.lo-ch { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 6px; min-height: 44px; padding: 3px 6px; border-radius: 7px; background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); cursor: pointer; }
.lo-ch > span { min-width: 0; } .lo-ch .lo-gem { width: 32px; height: 32px; } .lo-ch b { display: block; font: 700 13px/1.1 var(--u-disp); color: #f3ead2; } .lo-ch small { display: block; font-size: 10.5px; color: #a8d4ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lo-ch:active { background: rgba(255,190,90,.16); }
.lo-x5 { width: 36px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: rgba(255,214,140,.14); color: #ffe08a; font: 700 12px var(--u-disp); }
.lo-emb { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; }
.lo-heroes { flex: none; display: flex; gap: 6px; overflow-x: auto; height: 48px; padding: 1px; }
.lo-heroes button { flex: none; width: 44px; height: 44px; padding: 2px; border: 0; border-radius: 8px; background: rgba(255,255,255,.06); }
.lo-heroes button.on { box-shadow: 0 0 0 2px #ffd36a; } .lo-heroes .face, .lo-heroes .ini { width: 100%; height: 100%; border-radius: 6px; display: grid; place-items: center; font-style: normal; }
.lo-keys { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.lo-key { display: flex; flex-direction: column; align-items: center; gap: 3px; min-height: clamp(92px, 29vh, 128px); padding: 6px; border: 0; border-radius: 9px; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); text-align: center; }
.lo-key > svg, .lo-key > img { width: clamp(30px, 9vh, 42px); height: clamp(30px, 9vh, 42px); }
.lo-key b { font: 700 13.5px/1.1 var(--u-disp); color: #ffe08a; } .lo-key small { font-size: 10px; line-height: 1.25; color: #c8d0ea; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.lo-key.on { background: linear-gradient(180deg, rgba(255,190,90,.24), rgba(255,190,90,.05)); box-shadow: inset 0 0 0 1.5px rgba(255,214,120,.85), 0 0 12px rgba(255,180,70,.35); }
.lo-mins { display: flex; flex-direction: column; gap: 6px; }
.lo-mrow { display: grid; grid-template-columns: 44px repeat(3, minmax(0, 1fr)); gap: 6px; align-items: stretch; }
.lo-min { display: grid; grid-template-columns: 26px 1fr; align-items: center; gap: 0 6px; min-height: 46px; padding: 3px 8px; border: 0; border-radius: 8px; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); text-align: left; }
.lo-min .lo-mi { width: 26px; height: 26px; grid-row: span 2; } .lo-min b { font: 700 12.5px/1.1 var(--u-disp); color: #f3ead2; } .lo-min small { font-size: 10px; color: #a8d4ff; line-height: 1.2; }
.lo-min.on { background: rgba(120,190,255,.18); box-shadow: inset 0 0 0 1.5px rgba(150,210,255,.85); }
.lo-eact { display: flex; align-items: center; gap: 10px; } .lo-eact button { flex: none; height: 32px; padding: 0 12px; font-size: 13.5px; }
.lo-edesc { margin: 0; font-size: 11.5px; line-height: 1.35; color: #dfe6ff; }
.lo-pick { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 52vh; overflow: auto; min-width: min(560px, 84vw); text-align: left; padding: 2px; }
.lo-pick button { display: flex; flex-direction: column; gap: 1px; padding: 7px 10px; border: 0; border-radius: 8px; text-align: left; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); color: #e8eeff; }
.lo-pick button.on { background: linear-gradient(90deg, rgba(255,190,90,.24), rgba(255,190,90,.05)); box-shadow: inset 0 0 0 1.5px rgba(255,214,120,.85); }
.lo-pick b { font: 700 14px/1.1 var(--u-disp); color: #ffe08a; } .lo-pick small { font-size: 10.5px; color: #9aa6c8; } .lo-pick em { font-style: normal; font-size: 10.5px; color: #a8d4ff; }
#pick .pk-pill em.lv, #draft .dr-pill em.lv { font: 700 11px var(--u-disp); margin-left: 6px; color: #9ad0ff; font-style: normal; }
@media (max-height: 420px) { .lo-sum { font-size: 10.5px; } .lo-key small { -webkit-line-clamp: 2; } .lo-board { gap: 4px; } .lo-key { min-height: 88px; } .lo-ch { min-height: 38px; padding: 2px 6px; } .lo-chs { gap: 3px; } .lo-ch .lo-gem { width: 28px; height: 28px; } }
@media (max-width: 700px) { .lo-charm { grid-template-columns: 112px minmax(0, 1fr) 160px; gap: 6px; } .lo-cl { width: 40px; } .lo-keys { gap: 5px; } }
`;
let done = false;
export function loadoutCss() {
  if (done || typeof document === 'undefined') return; done = true;
  const s = document.createElement('style'); s.id = 'lo-css'; s.textContent = CSS; document.head.append(s);
}
