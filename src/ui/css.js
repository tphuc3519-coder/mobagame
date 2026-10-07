// Kiểu dáng các màn trước trận (sảnh, chọn chế độ, phòng chờ, chọn tướng, đội hình, tải trận) — chèn một lần bằng <style> (trang
// chơi thử dạng artifact chỉ cho phép CSS nội tuyến). Phong cách Liên Quân: nền xanh đêm trong mờ, viền vàng/lam sáng, nút chính vàng
// óng, nút phụ hình thoi xanh. Đơn vị theo chiều cao màn (vh) có kẹp min/max để điện thoại ngang 360–430 px cao vẫn vừa.
const CSS = `
#ui { position: fixed; inset: 0; z-index: 20; font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #f3f0e6; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; overflow: hidden; }
#ui[hidden] { display: none; }
#ui button { font-family: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
#ui svg { display: block; }
#show { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
#show.off { visibility: hidden; }
.scr { position: absolute; inset: 0; pointer-events: none; animation: scrIn .28s ease-out; }
.scr > * { pointer-events: auto; }
@keyframes scrIn { from { opacity: 0; } to { opacity: 1; } }
.face, .face.ini { display: block; object-fit: cover; }
i.ini { display: grid; place-items: center; font: 800 16px 'Be Vietnam Pro', system-ui; font-style: normal; color: #ffd28a; background: radial-gradient(circle at 50% 35%, #4a4380, #1b1836); }
.safe-l { left: max(10px, env(safe-area-inset-left)); } .safe-r { right: max(10px, env(safe-area-inset-right)); }

/* —— nút chung —— */
.btn-gold { border: 0; border-radius: 10px; padding: 0 28px; height: clamp(44px, 12vh, 58px); font: 900 clamp(16px, 4.6vh, 22px) 'Be Vietnam Pro', system-ui; letter-spacing: .04em; color: #3a1c00 !important;
  background: linear-gradient(180deg, #fff6c8 0%, #ffd662 38%, #f2a93a 70%, #c9761c 100%); box-shadow: 0 0 0 2px #fff3b0aa inset, 0 0 22px #ffb84a88, 0 4px 0 #8a4a10; text-shadow: 0 1px 0 #fff4c8; position: relative; }
.btn-gold:active, .btn-blue:active { transform: translateY(2px) scale(.98); }
.btn-gold[disabled] { filter: grayscale(.7) brightness(.7); }
.btn-blue { border: 1px solid #8fc8ff; border-radius: 10px; padding: 0 18px; height: 40px; font: 700 14px 'Be Vietnam Pro', system-ui; color: #eaf6ff !important;
  background: linear-gradient(180deg, #3d7fd8, #1f4a9c 60%, #16357a); box-shadow: 0 0 0 1px #0a1a40, 0 0 12px #3d8cff55, inset 0 1px 0 #ffffff44; }
.btn-ghost { border: 1px solid #ffffff33; border-radius: 10px; padding: 0 16px; height: 38px; font: 600 13px 'Be Vietnam Pro', system-ui; background: #0b1230b0; }
.dia { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; padding: 0; }
.dia > i { width: clamp(40px, 11.5vh, 54px); height: clamp(40px, 11.5vh, 54px); transform: rotate(45deg); border-radius: 8px; display: grid; place-items: center;
  background: linear-gradient(135deg, #5fb0ff, #2a62c8 55%, #173a8a); border: 2px solid #cfe8ff; box-shadow: 0 0 14px #4fa0ff99, inset 0 0 8px #ffffff55; }
.dia > i svg { width: 58%; height: 58%; transform: rotate(-45deg); }
.dia > span { font: 800 clamp(11px, 3.3vh, 14px) 'Be Vietnam Pro', system-ui; text-shadow: 0 1px 3px #000, 0 0 6px #000; white-space: nowrap; }
.badge { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #ff4a3a; color: #fff; font: 800 10px/16px 'Be Vietnam Pro', system-ui; text-align: center; box-shadow: 0 0 0 2px #0b1230; }
.rkb { display: block; filter: drop-shadow(0 2px 4px #000a); }
.stars { display: inline-flex; gap: 1px; align-items: center; } .stars b { color: #5a5f7a; font-size: 12px; } .stars b.on { color: #ffd36a; text-shadow: 0 0 6px #ffb84a; } .stars em { font-style: normal; font-weight: 800; margin-left: 2px; color: #ffe8a8; }

/* —— thông báo nhanh, hộp thoại, bảng phủ —— */
.ui-toast { position: fixed; left: 50%; top: max(14px, env(safe-area-inset-top)); transform: translate(-50%, -140%); z-index: 60; padding: 10px 18px; border-radius: 22px; background: #0b1230ee; border: 1px solid #e8c46a; color: #ffeec2; font: 600 14px 'Be Vietnam Pro', system-ui; transition: transform .25s; pointer-events: none; max-width: 80vw; text-align: center; }
.ui-toast.on { transform: translate(-50%, 0); }
.ui-dlg { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; background: #02040ccc; animation: scrIn .2s; }
.ui-dlg .box { min-width: min(380px, 86vw); max-width: 92vw; padding: 18px 20px 16px; border-radius: 14px; background: linear-gradient(180deg, #17224d, #0c1430); border: 1px solid #e8c46a99; box-shadow: 0 10px 40px #000c, inset 0 1px 0 #ffffff22; text-align: center; }
.ui-dlg h3 { margin: 0 0 10px; color: #ffe08a; font-size: 18px; } .ui-dlg .txt { font-size: 14px; color: #dfe6ff; line-height: 1.5; }
.ui-dlg .btns { display: flex; gap: 10px; justify-content: center; margin-top: 14px; } .ui-dlg .btns button { min-width: 110px; height: 40px; border-radius: 10px; border: 1px solid #ffffff44; background: #1a2a5a; font: 700 14px 'Be Vietnam Pro', system-ui; }
.ui-dlg .btns button.gold { background: linear-gradient(180deg, #ffe58a, #e8a23a); color: #3a1c00; border-color: #fff3b0; }
.ui-dlg input { width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px 12px; border-radius: 8px; border: 1px solid #8fb8ff88; background: #0a1028; color: #fff; font: 600 16px 'Be Vietnam Pro', system-ui; }
.ui-panel { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; background: radial-gradient(120% 90% at 50% 0%, #1c2c66f8, #0a1028fa 60%, #060a1cfc); transform: translateY(18px); opacity: 0; transition: transform .2s, opacity .2s; }
.ui-panel.on { transform: none; opacity: 1; } .ui-panel.out { opacity: 0; }
.ui-panel header { flex: none; display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 max(12px, env(safe-area-inset-right)) 0 max(8px, env(safe-area-inset-left)); background: linear-gradient(180deg, #0d1638, #0d163800); border-bottom: 1px solid #ffffff14; }
.ui-panel header h2 { margin: 0; font: 900 20px 'Be Vietnam Pro', system-ui; color: #ffe8a8; letter-spacing: .02em; text-shadow: 0 2px 0 #3a2008; }
.ui-panel .ui-back { width: 44px; height: 44px; border: 0; background: none; padding: 8px; } .ui-hr { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.ui-body { flex: 1; min-height: 0; overflow: auto; padding: 10px max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); -webkit-overflow-scrolling: touch; }

/* —— thanh tiền tệ (dùng ở sảnh và các bảng) —— */
.cur { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px 0 4px; border-radius: 16px; background: #050a1e99; border: 1px solid #ffffff1c; font: 800 14px 'Be Vietnam Pro', system-ui; }
.cur svg { width: 24px; height: 24px; } .cur.gem { color: #bfe4ff; }
.icb { position: relative; width: 38px; height: 38px; border: 0; padding: 5px; border-radius: 50%; background: radial-gradient(circle at 50% 30%, #2a3a70cc, #0a1230cc); box-shadow: 0 0 0 1px #ffffff24; }
.icb svg { width: 100%; height: 100%; }

/* —— SẢNH CHÍNH —— */
#home .hm-me { position: absolute; top: max(8px, env(safe-area-inset-top)); left: max(10px, env(safe-area-inset-left)); display: flex; gap: 8px; align-items: center; background: none; border: 0; padding: 0; text-align: left; }
#home .hm-me .face, #home .hm-me .ini { width: clamp(46px, 14vh, 62px); height: clamp(46px, 14vh, 62px); border-radius: 10px; border: 2px solid #ffd27a; box-shadow: 0 0 0 2px #3a2008, 0 0 14px #ffb84a88; background: #1b1836; }
#home .hm-me div { display: flex; flex-direction: column; gap: 2px; } #home .hm-me b { font-size: 15px; text-shadow: 0 1px 3px #000; } #home .hm-me small { font-size: 11px; color: #ffe08a; text-shadow: 0 1px 2px #000; }
#home .hm-me .lv { display: inline-block; padding: 1px 6px; border-radius: 6px; background: #0b1230cc; border: 1px solid #ffd27a88; color: #ffe08a; font-weight: 800; font-size: 11px; width: max-content; }
#home .hm-fr { position: absolute; left: max(14px, env(safe-area-inset-left)); top: calc(max(8px, env(safe-area-inset-top)) + clamp(60px, 17vh, 78px)); display: flex; flex-direction: column; gap: clamp(6px, 2vh, 10px); }
#home .hm-fr button { position: relative; width: clamp(36px, 11vh, 46px); height: clamp(36px, 11vh, 46px); padding: 0; border-radius: 10px; border: 2px solid #8fb8ff88; background: #0b1230aa; overflow: visible; }
#home .hm-fr button .face, #home .hm-fr button .ini { width: 100%; height: 100%; border-radius: 8px; }
#home .hm-fr button .dot { position: absolute; right: -3px; bottom: -3px; width: 10px; height: 10px; border-radius: 50%; background: #3ddc6a; box-shadow: 0 0 0 2px #0b1230; }
#home .hm-fr button.more { display: grid; place-items: center; border-radius: 50%; border-color: #ffffff33; } #home .hm-fr button.more svg { width: 70%; height: 70%; }
#home .hm-top { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); display: flex; gap: 8px; align-items: center; }
#home .hm-side { position: absolute; right: max(10px, env(safe-area-inset-right)); top: calc(max(8px, env(safe-area-inset-top)) + 46px); width: clamp(210px, 30vw, 290px); display: flex; flex-direction: column; gap: 6px; }
#home .ev { position: relative; height: clamp(64px, 19vh, 96px); border-radius: 10px; overflow: hidden; border: 1px solid #ffd27a99; background: #241848 center / cover; box-shadow: 0 4px 14px #000a; text-align: left; padding: 8px 10px; display: flex; flex-direction: column; justify-content: flex-end; }
#home .ev::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #120a30ee 20%, #120a3000 75%); }
#home .ev > * { position: relative; } #home .ev b { font: italic 900 clamp(14px, 4.4vh, 19px) 'Be Vietnam Pro', system-ui; color: #fff2c8; text-shadow: 0 2px 0 #5a2a00; } #home .ev small { font-size: 11px; color: #dcd4ff; }
#home .ev em { position: absolute; top: 6px; left: 8px; font: italic 900 13px 'Be Vietnam Pro', system-ui; color: #9cff7a; text-shadow: 0 1px 0 #0a3a00; font-style: italic; }
#home .bar { height: clamp(34px, 10vh, 44px); border-radius: 10px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: linear-gradient(90deg, #1e2c66e6, #101a40d0); border: 1px solid #8fb8ff55; font: 800 clamp(13px, 3.8vh, 16px) 'Be Vietnam Pro', system-ui; position: relative; }
#home .bar svg { width: 24px; height: 24px; } #home .bar small { margin-left: auto; font-size: 11px; color: #9fb4e8; font-weight: 600; }
#home .row2 { display: flex; gap: 6px; } #home .row2 .bar { flex: 1; justify-content: center; padding: 0 6px; flex-direction: column; gap: 1px; height: clamp(44px, 13vh, 58px); font-size: 12px; }
#home .hm-chat { position: absolute; left: max(10px, env(safe-area-inset-left)); bottom: calc(max(6px, env(safe-area-inset-bottom)) + clamp(52px, 15vh, 66px)); width: min(36vw, 330px); height: 32px; display: flex; align-items: center; gap: 8px; padding: 0 10px; border-radius: 16px; background: #050a1e99; border: 1px solid #ffffff18; font-size: 12px; color: #cfd8f4; overflow: hidden; white-space: nowrap; }
#home .hm-chat svg { width: 20px; height: 20px; flex: none; } #home .hm-chat b { color: #8fd3ff; font-weight: 700; }
#home .hm-nav { position: absolute; left: 0; bottom: 0; height: calc(clamp(50px, 14vh, 64px) + env(safe-area-inset-bottom)); right: clamp(300px, 44vw, 440px); padding-left: max(8px, env(safe-area-inset-left)); display: flex; align-items: center; gap: clamp(4px, 2vw, 20px);
  background: linear-gradient(0deg, #060b22f0, #060b22c0 70%, #060b2200); border-top: 1px solid #ffd27a33; }
#home .hm-nav button { position: relative; display: flex; align-items: center; gap: 6px; background: none; border: 0; padding: 6px 8px; font: 800 clamp(12px, 3.6vh, 15px) 'Be Vietnam Pro', system-ui; text-shadow: 0 1px 2px #000; white-space: nowrap; }
#home .hm-nav button svg { width: clamp(22px, 6.5vh, 30px); height: clamp(22px, 6.5vh, 30px); }
#home .hm-nav .badge { top: 0; right: -2px; }
#home .hm-play { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: max(8px, env(safe-area-inset-bottom)); display: flex; align-items: flex-end; gap: clamp(10px, 2.4vw, 22px); }
#home .hm-play .dias { display: flex; gap: clamp(12px, 2.6vw, 24px); padding-bottom: 2px; }
#home .rank-go { display: flex; align-items: center; gap: 6px; white-space: nowrap; width: clamp(176px, 27vw, 250px); height: clamp(52px, 15vh, 68px); padding: 0 12px 0 8px; border: 0; border-radius: 12px; clip-path: polygon(6% 0, 100% 0, 94% 100%, 0 100%);
  background: linear-gradient(180deg, #fff3b8, #ffd25a 40%, #e9952e 75%, #b8681a); box-shadow: inset 0 0 0 2px #fff6c8; color: #3a1c00 !important; }
#home .rank-go .rkb { width: clamp(38px, 11vh, 52px); height: clamp(38px, 11vh, 52px); flex: none; }
#home .rank-go div { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; } #home .rank-go b { font: 900 clamp(15px, 5vh, 25px) 'Be Vietnam Pro', system-ui; letter-spacing: .04em; text-shadow: 0 1px 0 #fff4c8; } #home .rank-go small { font: 800 11px 'Be Vietnam Pro', system-ui; opacity: .85; }
#home .hm-title { position: absolute; left: 50%; top: max(10px, env(safe-area-inset-top)); transform: translateX(-62%); text-align: center; pointer-events: none; }
#home .hm-title b { display: block; font: italic 900 clamp(18px, 5.5vh, 26px) 'Be Vietnam Pro', system-ui; color: #fff4dc; letter-spacing: .06em; text-shadow: 0 2px 0 #7a3b12, 0 0 16px #ff9a4088; }
#home .hm-title small { font-size: 10px; letter-spacing: .3em; color: #ffd28acc; }
#home .hm-cg { display: flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 8px; background: #050a1e99; font-size: 11px; color: #c8d0ea; } #home .hm-cg span { font-weight: 800; color: #ffb86a; }
#home .hm-cg i { flex: 1; height: 6px; border-radius: 3px; background: #ffffff1a; overflow: hidden; } #home .hm-cg i b { display: block; height: 100%; background: linear-gradient(90deg, #ff8a3a, #ffe08a); }
@media (max-width: 760px) { #home .hm-nav button span { display: none; } #home .hm-title { display: none; } #home .bar small, #home .ev small { display: none; } }

/* —— CHỌN CHẾ ĐỘ —— */
.md-list { display: flex; gap: clamp(10px, 2vw, 18px); height: 100%; align-items: stretch; justify-content: center; padding: 4px 0; }
.md-card { position: relative; flex: 1; max-width: 250px; min-width: 0; border-radius: 14px; overflow: hidden; border: 2px solid #8fb8ff55; background: #101a40 center / cover; padding: 0; text-align: left; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 8px 24px #000b; transition: transform .15s, border-color .15s; }
.md-card:active { transform: scale(.98); } .md-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, #060a1cf4 8%, #060a1c55 55%, #060a1c00); }
.md-card > * { position: relative; } .md-card .tag { position: absolute; top: 10px; left: 10px; padding: 3px 10px; border-radius: 10px; background: #ffd27a; color: #3a1c00; font: 900 12px 'Be Vietnam Pro', system-ui; }
.md-card .in { padding: 10px 12px 12px; } .md-card h3 { margin: 0; font: italic 900 clamp(18px, 5.4vh, 24px) 'Be Vietnam Pro', system-ui; color: #fff2c8; text-shadow: 0 2px 0 #4a2000; }
.md-card p { margin: 4px 0 0; font-size: 12px; color: #cdd8f6; line-height: 1.35; } .md-card.hot { border-color: #ffd27a; box-shadow: 0 0 18px #ffb84a77, 0 8px 24px #000b; }
.md-diff { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; } .md-diff span { padding: 4px 9px; border-radius: 8px; border: 1px solid #ffffff33; background: #0b1230cc; font: 700 11px 'Be Vietnam Pro', system-ui; } .md-diff span.on { background: #ffd27a; color: #3a1c00; border-color: #fff3b0; }

/* —— PHÒNG CHỜ GHÉP TRẬN —— */
#room { background: #0a1030 center / cover; }
#room::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #070c2400 0%, #070c2400 58%, #070c24cc 72%), linear-gradient(0deg, #060a1ccc, #060a1c00 35%); pointer-events: none; }
#room .rm-head { position: absolute; top: max(6px, env(safe-area-inset-top)); left: max(6px, env(safe-area-inset-left)); display: flex; align-items: center; gap: 10px; }
#room .rm-head .ui-back { width: 46px; height: 46px; border: 0; background: none; padding: 6px; }
#room .rm-head h2 { margin: 0; font: 900 clamp(20px, 6vh, 28px) 'Be Vietnam Pro', system-ui; color: #ffe8a8; text-shadow: 0 2px 0 #3a2008, 0 0 10px #000; }
#room .rm-head .icb { width: 34px; height: 34px; }
#room .rm-sub { position: absolute; top: calc(max(6px, env(safe-area-inset-top)) + 46px); left: max(16px, env(safe-area-inset-left)); font-size: 12px; color: #c8d4f4; text-shadow: 0 1px 3px #000; }
#room .rm-sub b { color: #ffe08a; }
#room .rm-slots { position: absolute; left: max(16px, env(safe-area-inset-left)); right: calc(clamp(230px, 31vw, 330px) + 24px); top: 26%; display: flex; justify-content: center; gap: clamp(8px, 1.6vw, 18px); }
#room .slot { position: relative; width: clamp(64px, 11vw, 112px); aspect-ratio: 1; flex: none; display: flex; flex-direction: column; align-items: center; }
#room .slot .box { width: 100%; height: 100%; border-radius: 8px; border: 2px solid #8fb0ff66; background: linear-gradient(180deg, #1e2a66cc, #0b1236cc); display: grid; place-items: center; font: 900 clamp(34px, 10vh, 56px) 'Be Vietnam Pro', system-ui; color: #6f8ae8; text-shadow: 0 0 10px #000; overflow: hidden; }
#room .slot.me .box { border-color: #ffd27a; box-shadow: 0 0 0 2px #3a2008, 0 0 20px #ffb84a99; }
#room .slot.fr .box { border-color: #8fd3ff; } #room .slot .box .face, #room .slot .box .ini { width: 100%; height: 100%; }
#room .slot .nm { margin-top: 6px; font: 800 clamp(11px, 3.4vh, 14px) 'Be Vietnam Pro', system-ui; color: #ffe8a8; text-shadow: 0 1px 3px #000; white-space: nowrap; max-width: 130%; overflow: hidden; text-overflow: ellipsis; }
#room .slot .rk { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #ffe8c0; text-shadow: 0 1px 3px #000; white-space: nowrap; } #room .slot .rk .rkb { width: 20px; height: 20px; }
#room .slot .host { position: absolute; left: -8px; top: -8px; width: 22px; height: 22px; border-radius: 50%; background: #ffd27a; display: grid; place-items: center; box-shadow: 0 0 0 2px #3a2008; }
#room .slot .host svg { width: 14px; height: 14px; }
#room .slot .kick { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: #c8402f; color: #fff; font: 900 13px/22px system-ui; padding: 0; }
#room .slot.empty .box { cursor: pointer; } #room .slot.wait .box { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { border-color: #8fd3ff; box-shadow: 0 0 16px #4fa8ff88; } }
#room .rm-side { position: absolute; right: 0; top: 0; bottom: 0; width: clamp(230px, 31vw, 330px); padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) 10px; display: flex; flex-direction: column; gap: 8px; background: linear-gradient(90deg, #0a1236e6, #0a1236f6); border-left: 1px solid #8fb8ff33; box-sizing: border-box; }
#room .rm-tabs { display: flex; justify-content: space-around; height: 36px; flex: none; border-bottom: 1px solid #ffffff14; } #room .rm-tabs button { flex: 1; border: 0; background: none; padding: 5px; } #room .rm-tabs button svg { width: 24px; height: 24px; margin: auto; } #room .rm-tabs button.on { border-bottom: 2px solid #8fd3ff; }
#room .rm-ev { flex: none; padding: 8px 10px; border-radius: 8px; background: linear-gradient(90deg, #7a4ae0, #b88aff); border: 1px solid #f0e0ff; font: 700 12px 'Be Vietnam Pro', system-ui; display: flex; justify-content: space-between; color: #fff; }
#room .rm-list { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
#room .frow { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 8px; background: #ffffff08; }
#room .frow .face, #room .frow .ini { width: clamp(36px, 10vh, 46px); height: clamp(36px, 10vh, 46px); border-radius: 6px; flex: none; }
#room .frow div { flex: 1; min-width: 0; display: flex; flex-direction: column; } #room .frow b { font-size: 13px; color: #ffe08a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #room .frow small { font-size: 11px; color: #c8d0ea; } #room .frow small.st { color: #ffcf6a; } #room .frow small.on { color: #6fe08a; } #room .frow small.off { color: #8a90a8; }
#room .frow button { width: 34px; height: 34px; flex: none; border-radius: 50%; border: 1px solid #8fd3ff88; background: #12306a; padding: 6px; } #room .frow button[disabled] { opacity: .35; }
#room .rm-btns { flex: none; display: flex; gap: 6px; } #room .rm-btns button { flex: 1; height: 36px; border-radius: 18px; border: 1px solid #8fb8ff66; background: #0b1a44; font: 700 13px 'Be Vietnam Pro', system-ui; }
#room .rm-go { flex: none; width: 100%; }
#room .rm-bot { position: absolute; left: max(10px, env(safe-area-inset-left)); bottom: max(8px, env(safe-area-inset-bottom)); display: flex; gap: 10px; align-items: center; }
#room .rm-bot .hm-chat { position: static; width: min(30vw, 260px); height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 10px; border-radius: 17px; background: #050a1ecc; border: 1px solid #ffffff18; font-size: 12px; color: #cfd8f4; } #room .rm-bot .hm-chat svg { width: 20px; height: 20px; }
#room .rm-bot .icb { width: 38px; height: 38px; }
#room .mm { position: absolute; left: calc((100% - clamp(230px, 31vw, 330px)) / 2); bottom: calc(max(8px, env(safe-area-inset-bottom)) + 52px); transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 8px 10px 8px 16px; border-radius: 24px; background: #0b1230ee; border: 1px solid #8fd3ff; box-shadow: 0 0 20px #3d8cff66; font: 700 14px 'Be Vietnam Pro', system-ui; white-space: nowrap; }
#room .mm b { font: 900 18px 'Be Vietnam Pro', ui-monospace; color: #8fd3ff; min-width: 54px; } #room .mm button { height: 30px; padding: 0 14px; border-radius: 15px; border: 1px solid #ff8a7a; background: #5a1a1a; font: 700 13px 'Be Vietnam Pro', system-ui; }
#room .mm .spin { width: 18px; height: 18px; border-radius: 50%; border: 3px solid #8fd3ff44; border-top-color: #8fd3ff; animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.found { text-align: center; } .found h3 { font: italic 900 24px 'Be Vietnam Pro', system-ui !important; color: #ffe08a; } .found .dots { display: flex; gap: 6px; justify-content: center; margin: 12px 0 4px; }
.found .dots i { width: 22px; height: 22px; border-radius: 4px; transform: rotate(45deg); background: #24305a; border: 1px solid #8fb8ff55; transition: background .2s; } .found .dots i.ok { background: #3ddc6a; border-color: #b8ffcc; box-shadow: 0 0 10px #3ddc6a; }
.found .tm { font: 900 30px 'Be Vietnam Pro', ui-monospace; color: #fff; margin-top: 6px; }

/* —— CHỌN TƯỚNG —— */
#pick { background: linear-gradient(90deg, #0a0820f0 0, #0a082000 30%, #0a082000 68%, #0a0820e0 82%); }
#pick .pk-left { position: absolute; left: 0; top: 0; bottom: 0; width: min(260px, 31vw); padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; background: linear-gradient(90deg, #0d0b1ff6 70%, #0d0b1f00); }
#pick .pk-left h4 { margin: 2px 4px; font: 900 15px 'Be Vietnam Pro', system-ui; color: #ffd28a; display: flex; justify-content: space-between; } #pick .pk-left h4 small { color: #cdd3f0; font-weight: 600; }
#pick .pk-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: clamp(84px, 26vh, 112px); gap: 6px; align-content: start; -webkit-overflow-scrolling: touch; }
#pick .hc { position: relative; padding: 0; border-radius: 8px; overflow: hidden; border: 2px solid #ffffff22; background: #151332; display: flex; flex-direction: column; }
#pick .hc img, #pick .hc .ini { width: 100%; flex: 1; min-height: 0; object-fit: cover; object-position: 50% 22%; }
#pick .hc span { flex: none; padding: 3px 6px; text-align: left; background: #0b0a18e6; } #pick .hc b { display: block; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pick .hc small { font-size: 10px; color: #cdb8ff; }
#pick .hc.on { border-color: #ffd28a; box-shadow: 0 0 12px #ffb45c99, inset 0 0 10px #ffb45c55; } #pick .hc.lock { filter: grayscale(.85) brightness(.5); } #pick .hc em { position: absolute; top: 4px; right: 4px; padding: 1px 6px; border-radius: 6px; background: #000a; font: 700 9px 'Be Vietnam Pro', system-ui; font-style: normal; color: #ffd28a; }
#pick .hc.taken::after { content: 'Đồng đội chọn'; position: absolute; inset: 0; display: grid; place-items: center; background: #000a; font: 800 11px 'Be Vietnam Pro', system-ui; color: #ffcf8a; }
#pick .pk-title { position: absolute; left: calc(min(260px, 31vw) + 16px); right: calc(min(240px, 29vw) + 96px); top: max(10px, env(safe-area-inset-top)); pointer-events: none; }
#pick .pk-title h1 { margin: 0; font: italic 900 clamp(24px, 7vh, 40px) 'Be Vietnam Pro', system-ui; color: #fff4dc; text-shadow: 0 2px 0 #7a3b12, 0 0 18px #ff9a4088; }
#pick .pk-title p { margin: 2px 0 0; display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; color: #f3e9d6cc; } #pick .pk-title p span { background: #0d0b1fcc; padding: 2px 8px; border-radius: 10px; border: 1px solid #ffd28a55; } #pick .pk-title p i { font-style: normal; color: #ffd28a; }
#pick .pk-timer { position: absolute; right: calc(min(240px, 29vw) + 16px); top: max(8px, env(safe-area-inset-top)); display: flex; flex-direction: column; align-items: flex-end; pointer-events: none; }
#pick .pk-timer b { font: 900 clamp(26px, 8vh, 38px) 'Be Vietnam Pro', ui-monospace; color: #fff; text-shadow: 0 0 12px #4fa8ff, 0 2px 0 #0a1a40; line-height: 1; } #pick .pk-timer small { font: 800 12px 'Be Vietnam Pro', system-ui; color: #8fd3ff; letter-spacing: .1em; } #pick .pk-timer.low b { color: #ff7a6a; text-shadow: 0 0 12px #ff3a2a; }
#pick .pk-skills { position: absolute; right: calc(min(240px, 29vw) + 14px); top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px; }
#pick .pk-skills button { width: clamp(44px, 13vh, 56px); height: clamp(44px, 13vh, 56px); border-radius: 50%; border: 2px solid #f3e9d655; background: radial-gradient(circle at 35% 30%, #3a3f66, #141830); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; }
#pick .pk-skills button.pas { border-color: #ffd28a; box-shadow: 0 0 10px #ffb45c88; } #pick .pk-skills b { font-size: 11px; color: #ffd28a; } #pick .pk-skills span { font-size: 8px; max-width: 48px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; opacity: .85; }
#pick .pk-tip { position: absolute; right: calc(min(240px, 29vw) + 80px); top: 50%; transform: translateY(-50%); width: min(260px, 34vw); padding: 10px 12px; border-radius: 10px; background: #0d0b1ff2; border: 1px solid #ffd28a88; font-size: 12px; line-height: 1.45; } #pick .pk-tip b { color: #ffd28a; } #pick .pk-tip p { margin: 4px 0 0; }
#pick .pk-team { position: absolute; right: 0; top: 0; bottom: 0; width: min(240px, 29vw); padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) 8px; box-sizing: border-box; display: flex; flex-direction: column; gap: 5px; background: linear-gradient(270deg, #0d0b1ff2 70%, #0d0b1f00); }
#pick .pk-rows { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 5px; }
#pick .pk-team h4 { margin: 0 0 2px; font: 900 13px 'Be Vietnam Pro', system-ui; color: #8fd3ff; letter-spacing: .06em; }
#pick .tm { display: flex; align-items: center; gap: 8px; padding: 4px; border-radius: 8px; background: linear-gradient(90deg, #12306acc, #0b1a4488); border: 1px solid #8fd3ff33; }
#pick .tm .face, #pick .tm .ini, #pick .tm .q { width: clamp(30px, 9vh, 40px); height: clamp(30px, 9vh, 40px); border-radius: 6px; flex: none; }
#pick .tm .q { display: grid; place-items: center; background: #1b2350; color: #6f8ae8; font: 900 18px system-ui; }
#pick .tm div { min-width: 0; display: flex; flex-direction: column; } #pick .tm b { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pick .tm small { font-size: 10px; color: #a8c4ff; } #pick .tm small.ok { color: #7dffa8; }
#pick .tm.me { border-color: #ffd27a; background: linear-gradient(90deg, #5a3a10cc, #2a1a0888); } #pick .tm.me small { color: #ffe08a; } #pick .tm.picking { animation: pulse 1.2s ease-in-out infinite; }
#pick .tm.foe { background: linear-gradient(90deg, #6a1a1acc, #3a0a0a88); border-color: #ff8a7a44; }
#pick .pk-bl { position: absolute; left: calc(min(260px, 31vw) + 14px); right: calc(min(240px, 29vw) + 10px); bottom: calc(max(10px, env(safe-area-inset-bottom)) + 10px); display: flex; flex-wrap: wrap-reverse; gap: 8px 6px; align-items: center; pointer-events: none; } #pick .pk-bl > * { pointer-events: auto; }
@media (max-width: 760px) { #pick .pk-pill { height: 30px; padding: 0 10px; font-size: 12px; } #pick .pk-title p i { display: none; } }
#pick .pk-spell { width: 46px; height: 46px; padding: 0; border: 0; background: none; position: relative; } #pick .pk-spell small { position: absolute; left: 50%; bottom: -14px; transform: translateX(-50%); font-size: 9px; white-space: nowrap; color: #f3e9d6cc; }
#pick .pk-spell svg, #pick .pk-spell img, #pick .pk-spell canvas { width: 100%; height: 100%; border-radius: 50%; }
#pick .pk-pill { height: 34px; padding: 0 12px; border-radius: 17px; background: #0d0b1fcc; border: 1px solid #ffd28a66; font: 13px 'Be Vietnam Pro', system-ui; } #pick .pk-pill b { color: #ffd28a; margin-right: 4px; }
#pick .pk-go { flex: none; width: 100%; padding: 0 10px; height: clamp(42px, 12vh, 54px); }
.pk-spells { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; max-height: 58vh; overflow: auto; text-align: left; }
.pk-spells button { display: grid; grid-template-columns: 40px 1fr; gap: 2px 8px; align-items: center; padding: 6px; border-radius: 10px; border: 1px solid #ffffff22; background: #0b1230; }
.pk-spells button.on { border-color: #ffd27a; box-shadow: 0 0 10px #ffb84a66; } .pk-spells button > :first-child { width: 40px; height: 40px; grid-row: span 2; border-radius: 50%; overflow: hidden; }
.pk-spells button svg, .pk-spells button img { width: 40px; height: 40px; display: block; } .pk-spells b { font-size: 13px; color: #ffe08a; } .pk-spells small { font-size: 10px; color: #c8d0ea; line-height: 1.3; }
#pick .pk-hint { position: absolute; left: calc(min(260px, 31vw) + 16px); bottom: calc(max(10px, env(safe-area-inset-bottom)) + 72px); margin: 0; font-size: 11px; color: #f3e9d666; pointer-events: none; }
@media (max-height: 520px) { #pick .pk-hint { display: none; } }

/* —— ĐỘI HÌNH (sau khi chọn xong) —— */
#lineup { background: radial-gradient(80% 90% at 60% 40%, #0b123000, #060a1ccc 80%), linear-gradient(0deg, #060a1cf0 0, #060a1c00 40%); }
#lineup .lu-name { position: absolute; left: max(18px, env(safe-area-inset-left)); top: 18%; }
#lineup .lu-name small { font: 800 13px 'Be Vietnam Pro', system-ui; color: #8fd3ff; letter-spacing: .2em; } #lineup .lu-name h1 { margin: 2px 0 0; font: italic 900 clamp(30px, 10vh, 54px) 'Be Vietnam Pro', system-ui; color: #fff4dc; text-shadow: 0 3px 0 #7a3b12, 0 0 24px #ff9a4088; }
#lineup .lu-name p { margin: 4px 0 0; font-size: 13px; color: #ffd28a; }
#lineup .lu-row { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; gap: clamp(16px, 4vw, 48px); align-items: flex-start; }
#lineup .lu-row::before { content: ''; position: absolute; left: -6%; right: -6%; top: clamp(30px, 9vh, 45px); height: 2px; background: linear-gradient(90deg, #ffb45c00, #ffb45c, #ffb45c00); }
#lineup .lu { position: relative; display: flex; flex-direction: column; align-items: center; animation: luIn .45s backwards; } @keyframes luIn { from { opacity: 0; transform: translateY(16px); } }
#lineup .lu .ring { width: clamp(60px, 18vh, 90px); height: clamp(60px, 18vh, 90px); border-radius: 50%; padding: 3px; background: conic-gradient(#ffb45c, #fff3c8, #ffb45c, #c8701c, #ffb45c); box-shadow: 0 0 18px #ff9a4088; }
#lineup .lu .ring .face, #lineup .lu .ring .ini { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 50% 35%, #3a4a8a, #12183a); }
#lineup .lu b { margin-top: 6px; font: 800 clamp(13px, 4vh, 17px) 'Be Vietnam Pro', system-ui; color: #8fd3ff; text-shadow: 0 1px 3px #000; } #lineup .lu small { font-size: clamp(11px, 3.4vh, 14px); color: #fff; text-shadow: 0 1px 3px #000; } #lineup .lu.me small { color: #ffd28a; font-weight: 800; }

#lineup .lu.foe .ring { background: conic-gradient(#ff5a4a, #ffd0c8, #ff5a4a, #8a1a1a, #ff5a4a); box-shadow: 0 0 18px #ff5a4a88; } #lineup .lu.foe b { color: #ff9a8a; }

/* —— TẢI TRẬN (VS) —— */
#loadscr { background: #0a1438; overflow: hidden; }
#loadscr .bg { position: absolute; inset: -30px; background: #0a1438 center / cover; filter: blur(14px) brightness(.55) saturate(1.2); }
#loadscr .bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, #1a2a6a55, #060a1c99); }
#loadscr .ld-rows { position: absolute; inset: max(6px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(4px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); display: grid; grid-template-rows: 1fr auto 1fr; align-items: center; justify-items: center; }
#loadscr .ld-team { display: flex; gap: clamp(6px, 1.4vw, 16px); justify-content: center; height: 100%; align-items: center; }
#loadscr .ld-card { position: relative; height: 100%; max-height: 46vh; aspect-ratio: 0.66; display: flex; flex-direction: column; }
#loadscr .ld-card .pic { position: relative; flex: 1; min-height: 0; border-radius: 4px; overflow: hidden; border: 2px solid #c0d4ff88; background: #1a2250; box-shadow: 0 6px 16px #000a; }
#loadscr .ld-team.foe .ld-card .pic { border-color: #ffb0a088; }
#loadscr .ld-card .pic img.cd { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
#loadscr .ld-card .pic::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, #060a1cf0 0, #060a1c00 46%); }
#loadscr .ld-team.ally .ld-card .pic { background: #1a3a8a; } #loadscr .ld-team.foe .ld-card .pic { background: #6a1a2a; }
#loadscr .ld-card .info { position: absolute; left: 0; right: 0; bottom: 8px; z-index: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
#loadscr .ld-card .info b { font: 800 clamp(11px, 3.6vh, 16px) 'Be Vietnam Pro', system-ui; color: #9fd8ff; text-shadow: 0 1px 3px #000; } #loadscr .ld-team.foe .info b { color: #ff9a8a; }
#loadscr .ld-card .info small { font-size: clamp(9px, 3vh, 13px); color: #fff; text-shadow: 0 1px 3px #000; max-width: 96%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#loadscr .ld-card .info .ic { display: flex; gap: 4px; margin-top: 4px; } #loadscr .ld-card .info .ic > * { flex: none; display: block; width: clamp(16px, 5.4vh, 24px); height: clamp(16px, 5.4vh, 24px); border-radius: 50%; overflow: hidden; background: #0008; box-shadow: 0 0 0 1px #ffffff55; }
#loadscr .ld-card.me .pic { border-color: #ffd27a; box-shadow: 0 0 0 1px #3a2008, 0 0 18px #ffb84a99; } #loadscr .ld-card.me .info small { color: #ffe08a; font-weight: 800; }
#loadscr .ld-card .crest { position: absolute; left: 50%; top: -6px; transform: translateX(-50%); z-index: 2; } #loadscr .ld-card .crest .rkb { width: clamp(26px, 8vh, 40px); height: clamp(26px, 8vh, 40px); }
#loadscr .ld-card .pb { flex: none; height: 4px; margin-top: 4px; border-radius: 2px; background: #00000066; overflow: hidden; }
#loadscr .ld-card .pb i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #4fa8ff, #9fe8ff); box-shadow: 0 0 6px #4fa8ff; transition: width .25s linear; }
#loadscr .ld-team.foe .ld-card .pb i { background: linear-gradient(90deg, #ff5a4a, #ffb09a); box-shadow: 0 0 6px #ff5a4a; }
#loadscr .ld-mid { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 2px 6px; gap: 12px; box-sizing: border-box; }
#loadscr .ld-tip { font-size: clamp(10px, 3.2vh, 13px); color: #e8ecff; text-shadow: 0 1px 3px #000; max-width: 46%; }
#loadscr .vs { font: italic 900 clamp(26px, 9vh, 46px) 'Be Vietnam Pro', system-ui; color: #ffe08a; text-shadow: 0 0 18px #ff9a40, 0 3px 0 #7a3b12; letter-spacing: -.04em; }
#loadscr .ld-pct { font: 800 clamp(11px, 3.4vh, 14px) 'Be Vietnam Pro', system-ui; color: #cfe4ff; text-align: right; max-width: 46%; text-shadow: 0 1px 3px #000; }
#loadscr.solo .ld-card { max-height: 74vh; } #loadscr.solo .ld-rows { grid-template-rows: 1fr auto; } #loadscr.solo .ld-teams { display: flex; align-items: center; gap: 4vw; height: 100%; justify-content: center; }

/* —— hết trận: chữ lớn giữa màn rồi sang màn kết quả —— */
#gover { position: fixed; inset: 0; z-index: 12; display: grid; place-content: center; text-align: center; pointer-events: none; font-family: 'Be Vietnam Pro', system-ui, sans-serif; animation: goIn .6s cubic-bezier(.2,.9,.3,1.2) backwards; }
#gover.win { background: radial-gradient(60% 40% at 50% 50%, #ffb84a44, #0000 70%); } #gover.lose { background: radial-gradient(60% 40% at 50% 50%, #2a3a6a66, #0000 70%); }
#gover b { font: italic 900 clamp(46px, 16vh, 96px)/1 'Be Vietnam Pro', system-ui; letter-spacing: .08em; } #gover small { font: 800 clamp(12px, 3.6vh, 18px) 'Be Vietnam Pro', system-ui; letter-spacing: .6em; color: #fff; opacity: .85; }
#gover.win b { color: #ffd36a; text-shadow: 0 0 30px #ffb84a, 0 4px 0 #7a3b12; } #gover.lose b { color: #d4dcf4; text-shadow: 0 0 24px #4f6aa8, 0 4px 0 #1a2040; }
@keyframes goIn { from { opacity: 0; transform: scale(1.6); } }
body.over #skills, body.over #extras, body.over #camBtn, body.over #scoreboard, body.over .setp { visibility: hidden; }
body.post #hud, body.post #skills, body.post #extras, body.post #shopRoot, body.post #scoreTop, body.post #scoreboard, body.post #fs, body.post #hudSet, body.post #lab, body.post #camBtn { display: none !important; }

/* —— kết quả trận (vào thẳng bằng ?hero=) —— */
#result .rs { min-width: min(440px, 88vw); padding: 18px 22px; border-radius: 16px; background: linear-gradient(180deg, #17224df2, #0c1430f2); border: 1px solid #e8c46a99; box-shadow: 0 10px 40px #000c; }
#result .rs h2 { font: italic 900 clamp(40px, 13vh, 64px) 'Be Vietnam Pro', system-ui !important; margin: 0; letter-spacing: .08em; }
#result .rs.win h2 { color: #ffd36a; text-shadow: 0 0 24px #ffb84a, 0 3px 0 #7a3b12; } #result .rs.lose h2 { color: #c8d0e8; text-shadow: 0 0 18px #4f6aa8, 0 3px 0 #1a2040; }
#result .rs .kda { margin: 6px 0 10px; font-size: 14px; color: #dfe6ff; } #result .rs .rw { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 6px 0; }
#result .rs .rw span { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; background: #0b1230; border: 1px solid #ffffff22; font: 800 14px 'Be Vietnam Pro', system-ui; } #result .rs .rw svg { width: 20px; height: 20px; }
#result .rs .rk { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0 2px; font: 800 15px 'Be Vietnam Pro', system-ui; } #result .rs .rk .rkb { width: 48px; height: 48px; }
#result .rs .rk em { font-style: normal; } #result .rs .up { color: #7dffa8; } #result .rs .down { color: #ff8a7a; }
`;

let done = false;
export function injectCss() {
  if (done) return; done = true;
  const s = document.createElement('style'); s.id = 'ui-css'; s.textContent = CSS; document.head.append(s);
}
