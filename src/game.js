import * as THREE from 'three';
import { createLoop } from './core/loop.js';
import { DUEL, ARENA } from './data/maps.js';
import { setupTeams } from './sim/lineup.js';
import { HEROES } from './data/heroes/index.js';
import { createWorld } from './sim/world.js';
import { createRenderer } from './render/renderer.js';
import { createPost } from './render/post.js';
import { pickLevel, LEVELS } from './render/quality.js';
import { addLights } from './render/lights.js';
import { createCamera, CAM_DISTANCE } from './render/camera.js';
import { buildArena } from './render/arenaMap.js';
import { createMinimap } from './hud/minimap.js';
import { createPortraits } from './hud/portraits.js';
import { createHudSettings } from './hud/settings.js';
import { createFog } from './render/fog.js';
import { buildMap, FOG_COLOR } from './render/mapBuilder.js';
import { createUnitViews } from './render/unitView.js';
import { createFx } from './render/fx.js';
import { createIndicators } from './render/indicators.js';
import { floorAt } from './render/env/floor.js';
import { createTowerRanges } from './render/towerRange.js';
import { createInput } from './hud/joystick.js';
import { createHud } from './hud/hud.js';
import { createSkillButtons } from './hud/skillButtons.js';
import { createShop } from './hud/shop.js';
import { warmItemArt } from './hud/itemArt.js';
import { preloadMonsters } from './render/monsterModels.js';
import { PLAYER_POS } from './render/env/foliage.js';
import { createSpellButtons } from './hud/spellButtons.js';
import { createCamLook } from './hud/camLook.js';
import { createScoreboard } from './hud/scoreboard.js';
import { STARTER, ITEMS } from './data/items.js';

import { SPELLS } from './data/spells.js';
import { CHARM_PAGES } from './data/charms.js';
import { computeBonus } from './sim/inventory.js';
/**
 * Vào trận với bot. opts: { mode: '1v1' | '5v5', heroId, enemyId (1v1), allies/foes (5v5: id tướng), spellId, charmId, difficulty, seed,
 * bot=true, dummies (1v1: 3 hình nộm), names: [{ heroId → tên người chơi } đội 0, đội 1], onGameOver({ world, player, winner }) }
 * Không có onGameOver (vào thẳng bằng ?hero=): hiện bảng THẮNG/THUA đơn giản, Chơi lại = tải lại trang.
 * Tham số URL dành cho kiểm thử: ?mode=5v5, ?debug=1, ?seed=, ?q=, ?dummies=1, ?ff=<giây>, ?shop=1, ?camdist=, ?nobot=1
 */
export function startMatch(opts) {
const q = new URLSearchParams(location.search);
const debug = q.has('debug');
const seed = opts.seed ?? parseInt(q.get('seed') || '1', 10);
const level = pickLevel();
const heroId = opts.heroId;

const arena = (opts.mode || q.get('mode')) === '5v5';
const map = arena ? ARENA : DUEL;
// 1v1: bản đồ một đường. 5v5: ba đường, 10 tướng (người chơi + 4 bot cùng đội, 5 bot đối thủ). ?dummies=1 (1v1) thêm 3 hình nộm.
const world = createWorld({ map, seed });
let player, enemy = null;
if (arena) {
  const lineup = setupTeams(world, { heroId, difficulty: opts.difficulty || 'normal', allies: opts.allies, foes: opts.foes });
  player = lineup.player;
} else {
  player = world.spawnHero(heroId, 0, { x: DUEL.spawn[0].x + 250, y: DUEL.road.y });
  if (opts.enemyId && opts.bot !== false) {
    enemy = world.spawnHero(opts.enemyId, 1, { x: DUEL.spawn[1].x - 250, y: DUEL.road.y });
    for (const id of STARTER[HEROES[opts.enemyId].roles[0]] || []) world.command(enemy.id, { type: 'buy', item: id });
    world.addBot(enemy, opts.difficulty || 'normal');
  }
  if (opts.dummies || q.has('dummies')) [[400, 0], [700, -150], [1000, 150]].forEach(([dx, dy]) => world.spawnDummy(1, { x: player.pos.x + dx + 400, y: DUEL.road.y + dy }));
}
// tên người chơi (sảnh đặt: mình + máy) — hiện trên đầu tướng, bảng tỉ số, màn kết quả
if (opts.names) for (const e of world.entities) if (e.kind === 'hero' && opts.names[e.team]?.[e.heroId]) e.playerName = opts.names[e.team][e.heroId];
if (opts.spellId && SPELLS[opts.spellId]) player.spell = { id: opts.spellId, ready: 0 };
// người chơi tự cộng điểm kỹ năng: đầu trận có 1 điểm, nút + hiện trên K1/K2 để chọn; mỗi lần lên cấp lại hiện + (bot vẫn tự cộng)
player.autoLevel = false; player.skillLevels = { s1: 0, s2: 0, s3: 0 }; player.skillPoints = player.level;
if (opts.charmId && CHARM_PAGES[opts.charmId]) { player.charm = CHARM_PAGES[opts.charmId]; player.bonus = computeBonus(player); }

let ctxLost = false; // mất ngữ cảnh WebGL (máy yếu/hết bộ nhớ): dừng mô phỏng tới khi khôi phục
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 4200, 9500); // xa hơn vì camera đã lùi (2400)
const { renderer } = createRenderer(document.getElementById('world'), level, {
  onLost: () => { ctxLost = true; loop.pause(); document.getElementById('lost').classList.add('on'); },
  onRestored: () => { ctxLost = false; document.getElementById('lost').classList.remove('on'); if (!document.hidden) loop.resume(); },
});
const sun = addLights(scene, renderer, level);
const env = arena ? buildArena(scene, ARENA, level) : buildMap(scene, DUEL, level);
const floor = (x, z, r = 0) => floorAt(map, x, z, r); // mặt bệ trại quái / hang mục tiêu lớn (phần nhìn): đơn vị, hiệu ứng, chỉ báo đặt lên trên
const views = createUnitViews(scene, 0, player.id, { floor });
const indicators = createIndicators(scene, { floor });
const towerRanges = createTowerRanges(scene);
const OVERVIEW = q.has('overview') ? parseFloat(q.get('overview') || '1.35') : 0;
const cam = createCamera({ distance: parseFloat(q.get('camdist') || String(CAM_DISTANCE)) });
const fx = createFx(scene, { views, camera: cam.camera, renderer, shake: (a, d) => cam.shake(a, d), team: player.team, me: player.id, floor });
cam.resize(innerWidth, innerHeight);
const fogOfWar = map.vision ? createFog(scene, map, player.team) : null;
if (OVERVIEW) { if (fogOfWar?.mesh) fogOfWar.mesh.visible = false; scene.fog.near = map.w * OVERVIEW * 0.9; scene.fog.far = map.w * OVERVIEW * 2.6; }
const portraits = createPortraits(renderer);
const minimap = createMinimap({ world, player, map, cam, fog: fogOfWar, portraits });
createHudSettings();
const post = level === 'low' || q.has('nobloom') ? null : createPost(renderer, scene, cam.camera, level);
addEventListener('resize', () => cam.resize(innerWidth, innerHeight));

const input = createInput(document.body);
const hud = createHud(document.getElementById('hud'), input, portraits);
const camLook = createCamLook({ minimap, map });
const score = createScoreboard({ world, player, portraits }); // tỉ số + K/D/A góc phải, chạm mở bảng tỉ số // giữ bản đồ nhỏ / kéo camera bên phải để nhìn chỗ khác
const buttons = createSkillButtons(document.getElementById('skills'), { world, player, indicators });
const spells = createSpellButtons(document.getElementById('extras'), { world, player, indicators });
const shop = createShop(document.getElementById('shopRoot'), { world, player });
warmItemArt((id) => ITEMS[id].tier); // vẽ sẵn icon trang bị lúc rảnh để mở shop không khựng
preloadMonsters(); // nạp sẵn model quái rừng + lính (lính ra từ giây 20, quái từ giây 30)
for (const id of STARTER[HEROES[heroId].roles[0]] || []) world.command(player.id, { type: 'buy', item: id }); // đồ khởi đầu theo vai (05 §5)
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

let ended = false;
function showResult(winner) {
  if (ended) return; ended = true;
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
  document.body.append(b); document.body.classList.add('over');
  setTimeout(() => { loop.pause(); b.remove(); document.body.classList.add('post'); opts.onGameOver({ world, player, winner }); }, 3200);
}
document.getElementById('again').onclick = () => location.reload();

const minFrame = 1000 / LEVELS[level].fps - 2;
let manual = false; // kiểm thử: __game.advance() tự bước mô phỏng + vẽ theo dt cố định (chụp hiệu ứng từng khung)
const fxSlow = parseFloat(q.get('fxslow') || '1'); // kiểm thử: quay chậm hiệu ứng
let lastDraw = 0, fpsAcc = 0, fpsN = 0, fps = 0, dead = false;

const loopRender = (...a) => loopCfg.render(...a);
const loopCfg = {
  update() {
    const d = input.dir();
    if (!player.bot) world.command(player.id, { type: 'move', dir: { x: d.x, y: d.y } }); // (kiểm thử: bot điều khiển thay người chơi)
    world.update(loop.tick);
  },
  render(alpha, dt, force) {
    if (manual && !force) return;
    const now = performance.now();
    if (!force && now - lastDraw < minFrame) return;
    lastDraw = now;
    const events = world.drainEvents();
    for (const ev of events) if (ev.type === 'gameover') showResult(ev.winner);
    views.handle(events); fx.handle(events, world); hud.handle(events, world);
    views.update(world, alpha, dt); fx.update(world, dt * fxSlow, player); towerRanges.update(world, player, dt);
    buttons.update(); spells.update(); shop.update(); score.update();
    const px = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha, py = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha;
    const d = input.dir();
    cam.follow(px, py, d.x, d.y, dt, camLook.look(px, py)); sun.follow(cam.target.x, cam.target.z); PLAYER_POS.value.set(px, 0, py); // tán cây quanh tướng thưa đi; bóng đổ theo chỗ camera nhìn
    if (dead !== !player.alive) { dead = !player.alive; document.body.classList.toggle('dead', dead); } // chết: màn hình xám, nút cửa hàng nhấp nháy
    if (OVERVIEW) { const c = cam.camera, cx = map.w / 2, cz = map.h / 2, D = map.w * OVERVIEW, pit = 52 * Math.PI / 180; // ?overview=<hệ số khoảng cách>: nhìn toàn bản đồ (chụp so sánh)
      c.far = D * 3; c.updateProjectionMatrix(); c.position.set(cx, Math.sin(pit) * D, cz + Math.cos(pit) * D); c.lookAt(cx, 0, cz + map.h * 0.04); sun.follow(cx, cz); }
    env.update(performance.now() / 1000, dt, cam.camera, innerHeight * renderer.getPixelRatio());
    if (post) post.render(); else renderer.render(scene, cam.camera);
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    const i = renderer.info.render;
    fogOfWar?.update(world, dt);
    minimap.draw();
    if (!OVERVIEW) hud.draw(world, cam.camera, player, enemy, debug ? [`FPS ${fps}  mức ${level}`, `draw ${i.calls}  tam giác ${i.triangles}`, `tick ${loop.tick}  seed ${seed}`, `pos ${player.pos.x | 0}, ${player.pos.y | 0}  đạn ${world.projectiles.length}`] : null);
  },
};
const loop = createLoop(loopCfg);
if (q.has('ff')) loop.fastForward(Math.round(parseFloat(q.get('ff')) * 30));
loop.start();
let acc = 0;
const advance = (sec, fps = 30) => { // dừng vòng lặp thật, bước tay sec giây với fps khung/giây
  manual = true; loop.pause();
  for (let i = 0; i < Math.round(sec * fps); i++) { acc += 1 / fps; while (acc >= 1 / 30) { acc -= 1 / 30; loop.fastForward(1); } loopRender(acc * 30, 1 / fps, true); }
};
window.__game = { world, player, enemy, loop, renderer, advance, portraits, scene, views, cam }; // phục vụ kiểm thử tự động

document.addEventListener('visibilitychange', () => (document.hidden ? loop.pause() : !ctxLost && !manual && !document.body.classList.contains('post') && loop.resume())); // chuyển tab về: không chạy tiếp khi đồ hoạ còn mất / đã sang màn kết quả
return window.__game;
}
