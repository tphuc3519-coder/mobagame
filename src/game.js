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
import { createInput } from './hud/joystick.js';
import { createHud } from './hud/hud.js';
import { createSkillButtons } from './hud/skillButtons.js';
import { createShop } from './hud/shop.js';
import { createSpellButtons } from './hud/spellButtons.js';
import { STARTER } from './data/items.js';

import { SPELLS } from './data/spells.js';
import { CHARM_PAGES } from './data/charms.js';
import { computeBonus } from './sim/inventory.js';
/**
 * Vào trận với bot. opts: { mode: '1v1' | '5v5', heroId, enemyId (1v1), spellId, difficulty, seed, bot=true, onExit }
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
  if (q.has('dummies')) [[400, 0], [700, -150], [1000, 150]].forEach(([dx, dy]) => world.spawnDummy(1, { x: player.pos.x + dx + 400, y: DUEL.road.y + dy }));
}
if (opts.spellId && SPELLS[opts.spellId]) player.spell = { id: opts.spellId, ready: 0 };
if (opts.charmId && CHARM_PAGES[opts.charmId]) { player.charm = CHARM_PAGES[opts.charmId]; player.bonus = computeBonus(player); }

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 4200, 9500); // xa hơn vì camera đã lùi (2400)
const { renderer } = createRenderer(document.getElementById('world'), level, {
  onLost: () => { loop.pause(); document.getElementById('lost').classList.add('on'); },
  onRestored: () => { document.getElementById('lost').classList.remove('on'); loop.resume(); },
});
const sun = addLights(scene, renderer, level);
const env = arena ? buildArena(scene, ARENA, level) : buildMap(scene, DUEL, level);
const views = createUnitViews(scene, 0, player.id);
const indicators = createIndicators(scene);
const cam = createCamera({ distance: parseFloat(q.get('camdist') || String(CAM_DISTANCE)) });
const fx = createFx(scene, { views, camera: cam.camera, renderer, shake: (a, d) => cam.shake(a, d), team: player.team });
cam.resize(innerWidth, innerHeight);
const fogOfWar = map.vision ? createFog(scene, map, player.team) : null;
const portraits = createPortraits(renderer);
const minimap = createMinimap({ world, player, map, cam, fog: fogOfWar, portraits });
createHudSettings();
const post = level === 'low' || q.has('nobloom') ? null : createPost(renderer, scene, cam.camera, level);
addEventListener('resize', () => cam.resize(innerWidth, innerHeight));

const input = createInput(document.body);
const hud = createHud(document.getElementById('hud'), input);
const buttons = createSkillButtons(document.getElementById('skills'), { world, player, indicators });
const spells = createSpellButtons(document.getElementById('extras'), { world, player, indicators });
const shop = createShop(document.getElementById('shopRoot'), { world, player });
for (const id of STARTER[HEROES[heroId].roles[0]] || []) world.command(player.id, { type: 'buy', item: id }); // đồ khởi đầu theo vai (05 §5)
if (q.has('shop')) shop.open(true);

// bảng thử (chỉ khi ?debug=1)
const panel = document.getElementById('lab');
panel.hidden = !debug;
panel.innerHTML = `<button id="labCd">Hồi chiêu 0</button><button id="labLv">Lên cấp 15</button><button id="labHeal">Hồi đầy</button><button id="labGold">+3000 vàng</button>`;
document.getElementById('labGold').onclick = () => { player.gold += 3000; };
document.getElementById('labCd').onclick = () => world.debug.resetCooldowns(player);
document.getElementById('labLv').onclick = () => world.debug.level15(player);
document.getElementById('labHeal').onclick = () => world.debug.fullHeal(player);
for (const b of panel.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());

function showResult(winner) {
  const el = document.getElementById('result');
  el.querySelector('h2').textContent = winner === player.team ? 'THẮNG' : 'THUA';
  el.querySelector('p').textContent = `Thời gian ${Math.floor(world.tick / 1800)} phút ${Math.floor(world.tick / 30) % 60} giây · K/D ${player.kills}/${player.deaths}${enemy ? ` · Máy (${HEROES[enemy.heroId].name}) ${enemy.kills}/${enemy.deaths}` : ''}`;
  el.classList.add('on');
}
document.getElementById('again').onclick = () => (opts.onExit ? opts.onExit() : location.reload());

const minFrame = 1000 / LEVELS[level].fps - 2;
let manual = false; // kiểm thử: __game.advance() tự bước mô phỏng + vẽ theo dt cố định (chụp hiệu ứng từng khung)
const fxSlow = parseFloat(q.get('fxslow') || '1'); // kiểm thử: quay chậm hiệu ứng
let lastDraw = 0, fpsAcc = 0, fpsN = 0, fps = 0;

const loopRender = (...a) => loopCfg.render(...a);
const loopCfg = {
  update() {
    const d = input.dir();
    world.command(player.id, { type: 'move', dir: { x: d.x, y: d.y } });
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
    views.update(world, alpha, dt); fx.update(world, dt * fxSlow, player);
    buttons.update(); spells.update(); shop.update();
    const px = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha, py = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha;
    const d = input.dir();
    cam.follow(px, py, d.x, d.y, dt); sun.follow(px, py);
    env.update(performance.now() / 1000, dt, cam.camera, innerHeight * renderer.getPixelRatio());
    if (post) post.render(); else renderer.render(scene, cam.camera);
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    const i = renderer.info.render;
    fogOfWar?.update(world, dt);
    minimap.draw();
    hud.draw(world, cam.camera, player, enemy, debug ? [`FPS ${fps}  mức ${level}`, `draw ${i.calls}  tam giác ${i.triangles}`, `tick ${loop.tick}  seed ${seed}`, `pos ${player.pos.x | 0}, ${player.pos.y | 0}  đạn ${world.projectiles.length}`] : null);
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
window.__game = { world, player, enemy, loop, renderer, advance, portraits, scene, views }; // phục vụ kiểm thử tự động

document.addEventListener('visibilitychange', () => (document.hidden ? loop.pause() : loop.resume()));
return window.__game;
}
