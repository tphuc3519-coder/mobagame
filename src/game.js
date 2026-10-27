import * as THREE from 'three';
import { createLoop } from './core/loop.js';
import { DUEL, ARENA } from './data/maps.js';
import { setupTeams } from './sim/lineup.js';
import { HEROES } from './data/heroes/index.js';
import { createWorld } from './sim/world.js';
import { acquireRenderer, BASE_EXPOSURE } from './render/renderer.js';
import { collectGpu, freeGpu, holdMaterials, releaseHeld } from './render/dispose.js';
import { keptShapeMaterials } from './render/vfx/shapes.js';
import { createScope, enterScope, on, track } from './core/scope.js';
import { closeSettings } from './ui/settingsModal.js';
import { hideTip } from './hud/tip.js';
import { aimReset } from './hud/aimPad.js';
import { createPost } from './render/post.js';
import { loadGfx, shadowSize } from './render/quality.js';
import { createAutoQuality } from './render/autoQuality.js';
import { addLights } from './render/lights.js';
import { createCamera, CAM_DISTANCE, CAM_NEAR } from './render/camera.js';
import { buildArena } from './render/arenaMap.js';
import { createMinimap } from './hud/minimap.js';
import { createPortraits } from './hud/portraits.js';
import { createHudSettings } from './hud/settings.js';
import { createFog } from './render/fog.js';
import { createOrbViews } from './render/orbs.js';
import { buildMap, FOG_COLOR } from './render/mapBuilder.js';
import { createUnitViews, releaseSkeletons } from './render/unitView.js';
import { loadHero } from './render/assets.js';
import { createFx } from './render/fx.js';
import { createIndicators } from './render/indicators.js';
import { floorAt } from './render/env/floor.js';
import { createTowerRanges } from './render/towerRange.js';
import { createInput } from './hud/joystick.js';
import { createHudLayout } from './hud/layout.js';
import { createHud } from './hud/hud.js';
import { createSkillButtons } from './hud/skillButtons.js';
import { createShop } from './hud/shop.js';
import { warmItemArt } from './hud/itemArt.js';
import { preloadMonsters, MINION_MODEL } from './render/monsterModels.js';
import { createMinion } from './render/structures.js';
import { createMonster } from './render/monsters.js';
import { MONSTERS } from './data/jungle.js';
import { PLAYER_POS } from './render/env/foliage.js';
import { createSpellButtons } from './hud/spellButtons.js';
import { createCamLook } from './hud/camLook.js';
import { createPingHud } from './hud/pings.js';
import { createScoreboard } from './hud/scoreboard.js';
import { STARTER, ITEMS, starterFor } from './data/items.js';
import { createGameSounds } from './audio/gameSounds.js';
import { sfx, music, stopVoices } from './audio/audio.js';
import { END } from './data/endgame.js';
import { endTarget, createEndCam } from './render/endCam.js';
import { prefs, onPref } from './core/prefs.js';

import { CHARM_PAGES } from './data/charms.js';
/**
 * Vào trận với bot. opts: { mode: '1v1' | '5v5', heroId, enemyId (1v1), allies/foes (5v5: id tướng), playerRole/allyRoles/foeRoles (5v5:
 * vị trí chốt ở màn chọn — data/roles.js), loadout ({ spellId, charm: trang bùa, emblem: phù hiệu } — world.setLoadout; không có thì dùng
 * spellId, charmId), difficulty, seed,
 * bot=true, dummies (1v1: 3 hình nộm), names: [{ heroId → tên người chơi } đội 0, đội 1], onGameOver({ world, player, winner }) }
 * Không có onGameOver (vào thẳng bằng ?hero=): hiện bảng THẮNG/THUA đơn giản, Chơi lại = tải lại trang.
 * Tham số URL dành cho kiểm thử: ?mode=5v5, ?debug=1, ?seed=, ?q=, ?dummies=1, ?ff=<giây>, ?shop=1, ?camdist=, ?nobot=1
 */
export function startMatch(opts) {
  // mọi listener toàn cục / phần tử gắn body / đăng ký cài đặt của trận đi qua một phạm vi để rời trận gỡ sạch (core/scope.js)
  const scope = createScope('match'), exit = enterScope(scope);
  try { return buildMatch(opts, scope); } finally { exit(); }
}
function buildMatch(opts, scope) {
const q = new URLSearchParams(location.search);
const debug = q.has('debug');
const seed = opts.seed ?? parseInt(q.get('seed') || '1', 10);
const gfx = loadGfx(), level = gfx.detail; // cài đặt đồ hoạ (render/quality.js); level = chi tiết cảnh (mật độ cây cỏ, shader nền/sông)
const heroId = opts.heroId;

const arena = (opts.mode || q.get('mode')) === '5v5';
const map = arena ? ARENA : DUEL;
// 1v1: bản đồ một đường. 5v5: ba đường, 10 tướng (người chơi + 4 bot cùng đội, 5 bot đối thủ). ?dummies=1 (1v1) thêm 3 hình nộm.
const world = createWorld({ map, seed });
let player, enemy = null;
if (arena) {
  const lineup = setupTeams(world, { heroId, difficulty: opts.difficulty || 'normal', allies: opts.allies, foes: opts.foes, playerRole: opts.playerRole, allyRoles: opts.allyRoles, foeRoles: opts.foeRoles });
  player = lineup.player;
} else {
  player = world.spawnHero(heroId, 0, { x: DUEL.spawn[0].x + 250, y: DUEL.road.y });
  if (opts.enemyId && opts.bot !== false) {
    enemy = world.spawnHero(opts.enemyId, 1, { x: DUEL.spawn[1].x - 250, y: DUEL.road.y });
    world.setLoadout(enemy, {}); // máy 1v1: phép mặc định của tướng + phù hiệu theo vai
    for (const id of STARTER[HEROES[opts.enemyId].roles[0]] || []) world.command(enemy.id, { type: 'buy', item: id });
    world.addBot(enemy, opts.difficulty || 'normal');
  }
  if (opts.dummies || q.has('dummies')) [[400, 0], [700, -150], [1000, 150]].forEach(([dx, dy]) => world.spawnDummy(1, { x: player.pos.x + dx + 400, y: DUEL.road.y + dy }));
}
// tên người chơi (sảnh đặt: mình + máy) — hiện trên đầu tướng, bảng tỉ số, màn kết quả
if (opts.names) for (const e of world.entities) if (e.kind === 'hero' && opts.names[e.team]?.[e.heroId]) e.playerName = opts.names[e.team][e.heroId];
// phép + bảng bùa + phù hiệu đã chọn trước trận (ui/loadout.js); vào thẳng bằng ?hero= thì theo spellId/charmId (phù hiệu mặc định theo vai)
world.setLoadout(player, opts.loadout || { spellId: opts.spellId, charm: opts.charmId ? CHARM_PAGES[opts.charmId] : undefined });
// người chơi tự cộng điểm kỹ năng: đầu trận có 1 điểm, nút + hiện trên K1/K2 để chọn; mỗi lần lên cấp lại hiện + (bot vẫn tự cộng)
player.autoLevel = false; player.skillLevels = { s1: 0, s2: 0, s3: 0 }; player.skillPoints = player.level;

let ctxLost = false; // mất ngữ cảnh WebGL (máy yếu/hết bộ nhớ): dừng mô phỏng tới khi khôi phục
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 4200, 9500); // xa hơn vì camera đã lùi (2400)
const rend = acquireRenderer('world', gfx, { // một renderer cho cả phiên (đấu lại trong trang giữ shader đã dịch — render/renderer.js)
  onLost: () => { ctxLost = true; loop.pause(); document.getElementById('lost').classList.add('on'); },
  onRestored: () => { ctxLost = false; document.getElementById('lost').classList.remove('on'); if (!document.hidden) loop.resume(); },
});
const { renderer } = rend;
const sun = addLights(scene, renderer, { shadow: shadowSize(gfx), on: gfx.shadows });
const env = arena ? buildArena(scene, ARENA, level) : buildMap(scene, DUEL, level);
env.group.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // bóng cây/đá/tường đã nướng sẵn trên nền (ground.js): lượt bóng thời gian thực chỉ vẽ nhân vật
const floor = (x, z, r = 0) => floorAt(map, x, z, r); // mặt bệ trại quái / hang mục tiêu lớn (phần nhìn): đơn vị, hiệu ứng, chỉ báo đặt lên trên
const views = createUnitViews(scene, 0, player.id, { floor, anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()), localTint: opts.skinTint || null });
const orbViews = createOrbViews(scene, world, { floor }); // cục máu sau trụ ngoài (sim/orbs.js)
const indicators = createIndicators(scene, { floor });
const towerRanges = createTowerRanges(scene);
const OVERVIEW = q.has('overview') ? parseFloat(q.get('overview') || '1.35') : 0;
const camDist = () => parseFloat(q.get('camdist') || String(prefs().camDist === 'near' ? CAM_NEAR : CAM_DISTANCE)); // Cài đặt → Thiết lập → Góc camera
const cam = createCamera({ distance: camDist() });
views.kick = (x, z, k) => cam.kick(x, z, k); // giật camera nhẹ khi chiêu của mình tới tư thế chạm (unitView / animator)
const fx = createFx(scene, { views, camera: cam.camera, renderer, shake: (a, d) => cam.shake(a, d), team: player.team, me: player.id, floor });
cam.resize(innerWidth, innerHeight);
const fogOfWar = map.vision ? createFog(scene, map, player.team) : null;
if (OVERVIEW) { if (fogOfWar?.mesh) fogOfWar.mesh.visible = false; scene.fog.near = map.w * OVERVIEW * 0.9; scene.fog.far = map.w * OVERVIEW * 2.6; }
const portraits = createPortraits(renderer);
const layout = createHudLayout(); // cỡ nút / bản đồ nhỏ / cần điều khiển theo thiết bị — trước bản đồ nhỏ (nó đọc cỡ từ đây)
const minimap = createMinimap({ world, player, map, cam, fog: fogOfWar, portraits, layout });
createHudSettings({ surrender: () => world.surrender(player.team), surrenderAfter: opts.surrenderAfter || 0, now: () => world.tick / 30, gfx, onGfx: (k) => applyGfx(k) });
const post = q.has('nobloom') ? null : createPost(renderer, scene, cam.camera, { bloom: gfx.bloom, aa: gfx.aa, strength: gfx.detail === 'high' ? 0.55 : 0.45, sharp: gfx.detail === 'high' ? 0.4 : 0.32 }); // luôn vẽ qua hậu kỳ (render/post.js; tắt ánh sáng rực chỉ bỏ lượt bloom) → đổi cài đặt không phải dịch lại shader
on(window, 'resize', () => cam.resize(innerWidth, innerHeight));

const input = createInput(document.body, layout);
const hud = createHud(document.getElementById('hud'), input, portraits);
const sounds = createGameSounds({ team: player.team, me: player.id }); // tiếng trận theo sự kiện mô phỏng (audio/gameSounds.js)
// cài đặt chung đổi được ngay trong trận (bảng Cài đặt → Thiết lập): góc camera gần/xa, độ sáng (độ phơi sáng tone map), hiệu ứng sương mù
const BRIGHT = [0.85, 0.93, 1, 1.09, 1.19], EXPO = BASE_EXPOSURE; // không đọc từ renderer (dùng lại giữa các trận — độ sáng không cộng dồn)
const applyPrefs = () => { const p = prefs(); renderer.toneMappingExposure = EXPO * BRIGHT[p.bright - 1]; if (fogOfWar?.mesh && !OVERVIEW) fogOfWar.mesh.visible = p.fogFx; cam.setDistance(camDist()); };
applyPrefs(); onPref((k) => { if (k === 'bright' || k === 'fogFx' || k === 'camDist') applyPrefs(); });
const camLook = createCamLook({ minimap, map });
const pingHud = map.lanes.length > 1 ? createPingHud({ world, player, map, cam, minimap, hudCanvas: document.getElementById('hud') }) : null; // tín hiệu (chỉ 5v5)
if (pingHud) minimap.setOverlay((c, wx, wy) => pingHud.minimap(c, wx, wy));
const score = createScoreboard({ world, player, portraits }); // tỉ số + K/D/A góc phải, chạm mở bảng tỉ số // giữ bản đồ nhỏ / kéo camera bên phải để nhìn chỗ khác
const buttons = createSkillButtons(document.getElementById('skills'), { world, player, indicators, camera: cam.camera, input, views }); // camera/input/views: chạm chọn địch + dấu mục tiêu (Cài đặt điều khiển)
const spells = createSpellButtons(document.getElementById('extras'), { world, player, indicators, lockId: buttons.lockId, preview: buttons.preview }); // đồ khoá mục tiêu: dùng chung mục tiêu khoá + dấu xem trước
const shop = createShop(document.getElementById('shopRoot'), { world, player });
warmItemArt((id) => ITEMS[id].tier); // vẽ sẵn icon trang bị lúc rảnh để mở shop không khựng
preloadMonsters(); // nạp sẵn model quái rừng + lính (lính ra từ giây 20, quái từ giây 30)
for (const id of starterFor(HEROES[heroId], player.role, player.spell?.id)) world.command(player.id, { type: 'buy', item: id }); // đồ khởi đầu theo vị trí / vai (05 §5)
if (q.has('shop')) shop.open(true);

// bảng thử (chỉ khi ?debug=1)
const panel = document.getElementById('lab');
panel.hidden = !debug;
panel.innerHTML = `<button id="labCd">Hồi chiêu 0</button><button id="labLv">Lên cấp 15</button><button id="labHeal">Hồi đầy</button><button id="labGold">+3000 vàng</button><button id="labDmg">Số sát thương</button>`;
document.getElementById('labGold').onclick = () => { player.gold += 3000; };
document.getElementById('labDmg').onclick = () => hud.previewDamage(player); // xem 6 kiểu số sát thương (vật lý / phép / chuẩn, thường + chí mạng)
document.getElementById('labCd').onclick = () => world.debug.resetCooldowns(player);
document.getElementById('labLv').onclick = () => world.debug.level15(player);
document.getElementById('labHeal').onclick = () => world.debug.fullHeal(player);
for (const b of panel.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());

// cuối trận: camera trượt tới nhà chính bên thua (data/endgame.js), nổ + rung khi gần tới; đầu hàng thì nhà chính vẽ như đã đổ
let endCam = null, blast = null;
function beginEnd(ev) {
  if (endCam || OVERVIEW) return; const core = endTarget(world, ev.winner); if (!core) return;
  endCam = createEndCam({ from: { x: cam.target.x, z: cam.target.z }, to: { x: core.pos.x, z: core.pos.y + END.liftZ }, panSec: END.panSec });
  cam.setDistance(END.camDist); if (fogOfWar?.mesh) fogOfWar.mesh.visible = false; if (core.alive) views.down(core.id); blast = core;
}
let ended = false;
function showResult(winner) {
  if (ended) return; ended = true; closeSettings();
  const win = winner === player.team;
  if (!opts.onGameOver) {
    const el = document.getElementById('result');
    el.querySelector('h2').textContent = win ? 'THẮNG' : 'THUA';
    el.querySelector('p').textContent = `Thời gian ${Math.floor(world.tick / 1800)} phút ${Math.floor(world.tick / 30) % 60} giây · K/D ${player.kills}/${player.deaths}${enemy ? ` · Máy (${HEROES[enemy.heroId].name}) ${enemy.kills}/${enemy.deaths}` : ''}`;
    el.classList.add('on');
    return;
  }
  // nhà chính nổ: chữ CHIẾN THẮNG / THẤT BẠI giữa màn ~3 giây (trận vẫn vẽ cảnh nổ), rồi dừng vòng lặp và mở các màn kết quả
  const b = document.createElement('div'); b.id = 'gover'; b.className = win ? 'win' : 'lose';
  b.innerHTML = `<b>${win ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</b><small>${win ? 'VICTORY' : 'DEFEAT'}</small>`;
  document.body.append(track(b)); document.body.classList.add('over');
  // màn kết quả mở: gỡ luôn listener / HUD của trận (cần điều khiển trên body giữ con trỏ chuột — để lại thì chuột không bấm được nút màn kết quả)
  scope.later(() => { loop.stop(); b.remove(); document.body.classList.add('post'); scope.dispose(); opts.onGameOver({ world, player, winner }); }, END.bannerSec * 1000); // dừng hẳn vòng vẽ: màn kết quả che kín cảnh 3D (trước vẫn vẽ ~60 khung/giây phía sau, tốn pin)
}
document.getElementById('again').onclick = () => location.reload();

let minFrame = 1000 / gfx.fps - 2;
// tự hạ chất lượng khi máy không giữ nổi FPS mục tiêu (autoQuality.js), bắt đầu từ cài đặt người chơi chọn:
// tắt khử răng cưa → độ phân giải ×0,84 → ×0,7 → tắt bóng đổ thời gian thực → tắt ánh sáng rực → ×0,86
const makeAuto = () => {
  if (q.has('noauto') || !gfx.auto) return null;
  const pr0 = rend.basePixelRatio(), steps = [{ pr: pr0, shadow: gfx.shadows, aa: gfx.aa, bloom: gfx.bloom }], push = (o) => steps.push({ ...steps[steps.length - 1], ...o });
  if (gfx.aa) push({ aa: 0 });
  for (const k of [0.84, 0.7]) { const v = Math.max(0.75, Math.round(pr0 * k * 100) / 100); if (v < steps[steps.length - 1].pr - 0.05) push({ pr: v }); }
  if (gfx.shadows) push({ shadow: false });
  if (gfx.bloom && post) push({ bloom: false });
  const last = steps[steps.length - 1].pr; if (last * 0.86 >= 0.75) push({ pr: Math.round(last * 0.86 * 100) / 100 });
  return steps.length < 2 ? null : createAutoQuality({ target: gfx.fps, steps, apply: (st) => { rend.setPixelRatio(st.pr); post?.resize(); post?.set?.({ bloom: st.bloom, aa: st.aa }); sun.setShadows(st.shadow); } });
};
let auto = makeAuto();
// FPS góc trên (Cài đặt → Hiện FPS): số khung/giây thực + bậc tự giảm đang dùng
const fpsTag = document.createElement('div'); fpsTag.id = 'fpsTag'; fpsTag.hidden = !gfx.showFps; document.body.append(track(fpsTag));
/** Áp cài đặt đồ hoạ vừa đổi trong trận (bảng cài đặt hud/settings.js). Chi tiết cảnh áp dụng từ trận sau. */
function applyGfx(k) {
  if (k === 'detail') return;
  rend.setScale(gfx.scale); post?.resize();
  post?.set?.({ bloom: gfx.bloom, aa: gfx.aa });
  sun.setShadowSize?.(shadowSize(gfx)); sun.setShadows(gfx.shadows);
  minFrame = 1000 / gfx.fps - 2;
  auto = makeAuto();
  fpsTag.hidden = !gfx.showFps;
}
let manual = false; // kiểm thử: __game.advance() tự bước mô phỏng + vẽ theo dt cố định (chụp hiệu ứng từng khung)
const fxSlow = parseFloat(q.get('fxslow') || '1'); // kiểm thử: quay chậm hiệu ứng
let lastDraw = 0, lastMini = 0, fpsAcc = 0, fpsN = 0, fps = 0, dead = false, gray = 0;
if (!post) document.body.classList.add('nopost'); // không hậu kỳ (?nobloom): màn hình xám khi chết bằng CSS

const loopRender = (...a) => loopCfg.render(...a);
const loopCfg = {
  update() {
    const d = input.dir();
    if (!player.bot) world.command(player.id, { type: 'move', dir: { x: d.x, y: d.y } }); // (kiểm thử: bot điều khiển thay người chơi)
    world.update(loop.tick);
  },
  render(alpha, dtFrame, force) {
    if (manual && !force) return;
    const now = performance.now();
    if (!force && now - lastDraw < minFrame) return;
    // hoạt ảnh / camera / hiệu ứng chạy theo thời gian từ lần VẼ trước (khoá 30 khung/giây ở mức Thấp: mỗi lần vẽ cách 2 nhịp màn hình —
    // trước đây lấy nhịp màn hình nên mọi thứ chậm một nửa)
    const dt = force || !lastDraw ? dtFrame : Math.min(0.25, (now - lastDraw) / 1000);
    if (!force && lastDraw && auto) auto.frame(now - lastDraw);
    lastDraw = now;
    const events = world.drainEvents();
    for (const ev of events) if (ev.type === 'gameover') { beginEnd(ev); showResult(ev.winner); }
    views.handle(events); fx.handle(events, world); hud.handle(events, world); sounds.handle(events, world); pingHud?.handle(events);
    views.update(world, alpha, dt, cam.camera); fx.update(world, dt * fxSlow, player); towerRanges.update(world, player, dt);
    buttons.update(); spells.update(); shop.update(); score.update();
    const px = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha, py = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha;
    const d = input.dir();
    cam.follow(px, py, endCam ? 0 : d.x, endCam ? 0 : d.y, dt, endCam ? endCam.look(dt) : camLook.look(px, py));
    if (blast && endCam.t >= END.blastAt) { fx.coreBlast(blast.pos.x, blast.pos.y, blast.team === player.team); cam.shake(END.shake, END.shakeSec); sfx('tower_down', { vol: 1, announce: true }); blast = null; } sun.follow(cam.target.x, cam.target.z); PLAYER_POS.value.set(px, 0, py); // tán cây quanh tướng thưa đi; bóng đổ theo chỗ camera nhìn
    sounds.update(world, cam.target, cam.camera); // tâm nghe theo camera
    if (dead !== !player.alive) { dead = !player.alive; document.body.classList.toggle('dead', dead); } // chết: màn hình xám, nút cửa hàng nhấp nháy
    if (post && gray !== (dead ? 1 : 0)) { gray = dead ? Math.min(1, gray + dt * 3) : Math.max(0, gray - dt * 4); post.set({ gray }); } // xám dần khi chết, hồi sinh thì màu về
    if (OVERVIEW) { const c = cam.camera, cx = map.w / 2, cz = map.h / 2, D = map.w * OVERVIEW, pit = 52 * Math.PI / 180; // ?overview=<hệ số khoảng cách>: nhìn toàn bản đồ (chụp so sánh)
      c.far = D * 3; c.updateProjectionMatrix(); c.position.set(cx, Math.sin(pit) * D, cz + Math.cos(pit) * D); c.lookAt(cx, 0, cz + map.h * 0.04); sun.follow(cx, cz); }
    env.update(performance.now() / 1000, dt, cam.camera, innerHeight * renderer.getPixelRatio());
    orbViews.update(world, dt, performance.now() / 1000);
    if (post) post.render(); else renderer.render(scene, cam.camera);
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; if (!fpsTag.hidden) fpsTag.textContent = `${fps} FPS${auto?.step ? ` · tự giảm ${auto.step}` : ''}`; }
    const i = renderer.info.render;
    fogOfWar?.update(world, dt);
    if (force || now - lastMini > 45) { lastMini = now; minimap.draw(); } // bản đồ nhỏ ~20 lần/giây là đủ
    if (!OVERVIEW) hud.draw(world, cam.camera, player, enemy, debug ? [`FPS ${fps}  ${gfx.preset}  bậc ${auto?.step ?? '-'}  px ${renderer.getPixelRatio()}`, `draw ${i.calls}  tam giác ${i.triangles}`, `tick ${loop.tick}  seed ${seed}`, `pos ${player.pos.x | 0}, ${player.pos.y | 0}  đạn ${world.projectiles.length}`] : null);
    if (!OVERVIEW) pingHud?.draw();
  },
};
const loop = createLoop(loopCfg);
if (q.has('ff')) loop.fastForward(Math.round(parseFloat(q.get('ff')) * 30));
/** Dịch sẵn shader trước khi vào trận: trước đây khung đầu đứng hình, rồi lần đầu lính / quái / mỗi loại hiệu ứng chiêu / vùng bản đồ mới
 *  (ô cảnh ngoài màn hình) xuất hiện lại khựng — iPhone dịch mỗi shader 0,05–0,3 giây. Dựng tạm lính 4 loại × 2 đội, quái mọi loại, mỗi
 *  loại hình hiệu ứng một cái, compileAsync cả cảnh (gồm chỉ báo chiêu đang ẩn), vẽ thử một khung (bóng đổ, hậu kỳ) sau màn che
 *  "Đang vào trận…". Quá ~6 giây thì vào luôn. */
async function warmUp() {
  const cover = document.createElement('div'); cover.id = 'warm';
  cover.style.cssText = 'position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;gap:10px;background:#0b0e1a;color:#e8dcc0;font:700 15px "Be Vietnam Pro",system-ui,sans-serif;letter-spacing:.04em';
  cover.innerHTML = '<span>Đang vào trận…</span>'; document.body.append(track(cover)); const t0 = performance.now();
  const tick = () => new Promise((r) => setTimeout(r, 0)), within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
  try {
    const heroIds = world.entities.filter((e) => e.kind === 'hero').map((e) => e.heroId);
    views.update(world, 1, 0); // dựng view mọi đơn vị; chờ model tướng gắn vào (vào thẳng trận chưa qua màn tải) để dịch luôn vật liệu tướng
    await within(Promise.all(heroIds.map((id) => loadHero(id).catch(() => null))), 6000); await tick(); await tick();
    if (disposed) return;
    await within(preloadMonsters().catch(() => {}), 3000);
    await within(portraits.prime(heroIds), 6000); // chân dung bản đồ nhỏ / bảng tỉ số / thông báo
    const tmp = new THREE.Group(); tmp.position.set(player.pos.x, -420, player.pos.y); scene.add(tmp); // dưới mặt đất, trong hộp bóng: lượt vẽ thử dịch cả biến thể bóng đổ
    for (const t of Object.keys(MINION_MODEL)) for (const team of [0, 1]) tmp.add(createMinion(t, team).object);
    for (const [type, d] of Object.entries(MONSTERS)) for (const m of Object.keys(d.stats || { x: 1 })) tmp.add(createMonster(type, m).object);
    tmp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const undo = fx.warm?.();
    // dịch đúng biến thể sẽ dùng: có hậu kỳ thì cảnh vẽ vào render target của hậu kỳ (không tone map trong vật liệu, màu tuyến tính)
    if (post) renderer.setRenderTarget(post.target);
    const ready = renderer.extensions.has('KHR_parallel_shader_compile') ? renderer.compileAsync(scene, cam.camera) : (renderer.compile(scene, cam.camera), null); // phần tạo chương trình chạy đồng bộ ngay trong lời gọi
    renderer.setRenderTarget(null);
    if (ready) await within(ready, 6000); // không có dịch song song: lượt vẽ thử dưới đây chờ dịch xong (vẫn sau màn che)
    if (disposed) return;
    cam.follow(player.pos.x, player.pos.y, 0, 0, 1);
    sun.cover(map.w / 2, map.h / 2, Math.max(map.w, map.h) * 1.1); // lượt bóng phủ cả bản đồ: dịch biến thể bóng của mọi vật đổ bóng
    if (post) post.render(); else renderer.render(scene, cam.camera); // dịch nốt biến thể bóng đổ + hậu kỳ
    sun.cover(); sun.follow(cam.target.x, cam.target.z);
    releaseHeld(liveMaterials()); // vật liệu trận trước không còn dùng: giờ mới huỷ (chương trình dùng chung đã gắn vào vật liệu trận này)
    scene.remove(tmp); releaseSkeletons(tmp); undo?.(); warmRoots.push(tmp); // lính / quái mẫu đã tải lên GPU: dọn cùng trận
  } catch (e) { console.warn('Dịch sẵn shader lỗi', e); }
  cover.remove(); warmMs = Math.round(performance.now() - t0);
}
let warmMs = 0, disposed = false; const warmRoots = [];
warmUp().then(() => { if (disposed) return; loop.start(); music('field'); sfx('match_start', { announce: true }); }); // âm nền trận (gió, lá, chim, suối) + tù và vào trận
let acc = 0;
const advance = (sec, fps = 30) => { // dừng vòng lặp thật, bước tay sec giây với fps khung/giây
  manual = true; loop.pause();
  for (let i = 0; i < Math.round(sec * fps); i++) { acc += 1 / fps; while (acc >= 1 / 30) { acc -= 1 / 30; loop.fastForward(1); } loopRender(acc * 30, 1 / fps, true); }
};
/** Vật liệu đang dùng (cảnh + mọi đơn vị kể cả đang gỡ khỏi cảnh + hậu kỳ). */
const liveMaterials = () => { const c = collectGpu([scene, ...views.roots()]); for (const m of post?.materials() || []) c.materials.add(m); return c.materials; };
/** Rời trận (đấu lại / về sảnh ngay trong trang): dừng vòng lặp, gỡ listener + DOM của trận, trả bộ nhớ GPU, giữ vật liệu một thế hệ
 *  (render/dispose.js), cất renderer (render/renderer.js park). Gọi lại lần hai không làm gì. */
function disposeMatch() {
  if (disposed) return; disposed = true;
  loop.stop(); scope.dispose(); closeSettings(); hideTip(); aimReset(); sounds.dispose(); stopVoices(0.1); hud.dispose();
  for (const id of ['skills', 'extras', 'shopRoot']) { const el = document.getElementById(id); if (el) el.textContent = ''; }
  panel.hidden = true; document.getElementById('lost')?.classList.remove('on'); document.getElementById('result')?.classList.remove('on');
  document.body.classList.remove('over', 'post', 'dead', 'nopost');
  const progU = (m) => renderer.properties.get(m).uniforms; // ảnh gắn qua onBeforeCompile (nền, cây, nước…)
  const c = collectGpu([scene, ...views.roots(), ...warmRoots], undefined, progU); views.dispose(); freeGpu(c);
  for (const t of collectGpu(keptShapeMaterials().map((m) => ({ material: m }))).textures) t.dispose(); // ảnh của vật liệu mẫu hiệu ứng (vật liệu giữ cả phiên)
  const postMats = post?.dispose() || []; sun.dispose?.(); fogOfWar?.dispose?.();
  scene.clear(); scene.environment = null; scene.fog = null;
  holdMaterials([...c.materials, ...postMats]); rend.park();
  if (window.__game === api) window.__game = null; delete window.__fxdbg;
}
const api = window.__game = { world, player, enemy, loop, renderer, advance, portraits, scene, views, cam, env, input, layout, get auto() { return auto; }, sun, post, gfx, indicators, pingHud, get warmMs() { return warmMs; }, dispose: disposeMatch }; // phục vụ kiểm thử tự động

on(document, 'visibilitychange', () => { auto?.reset(); return document.hidden ? loop.pause() : !ctxLost && !manual && !document.body.classList.contains('post') && loop.resume(); }); // chuyển tab về: không chạy tiếp khi đồ hoạ còn mất / đã sang màn kết quả
return window.__game;
}
