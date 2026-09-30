import * as THREE from 'three';
import { createLoop } from './core/loop.js';
import { DUEL } from './data/maps.js';
import { ALPHA, HEROES } from './data/heroes/index.js';
import { createWorld } from './sim/world.js';
import { createRenderer } from './render/renderer.js';
import { pickLevel, LEVELS } from './render/quality.js';
import { addLights } from './render/lights.js';
import { createCamera } from './render/camera.js';
import { buildMap } from './render/mapBuilder.js';
import { createUnitViews } from './render/unitView.js';
import { createFx } from './render/fx.js';
import { createIndicators } from './render/indicators.js';
import { createInput } from './hud/joystick.js';
import { createHud } from './hud/hud.js';
import { createSkillButtons } from './hud/skillButtons.js';

const q = new URLSearchParams(location.search);
const debug = q.has('debug');
const seed = parseInt(q.get('seed') || '1', 10);
const level = pickLevel();
const heroId = ALPHA.includes(q.get('hero')) ? q.get('hero') : 'hoa_ren';

// Màn thử (Mốc 2): mình + 3 hình nộm cách 400 / 700 / 1000 (10 §Mốc 2)
const world = createWorld({ map: DUEL, seed });
const player = world.spawnHero(heroId, 0, DUEL.spawn[0]);
[[400, 0], [700, -150], [1000, 150]].forEach(([dx, dy]) => world.spawnDummy(1, { x: player.pos.x + dx, y: DUEL.road.y + dy }));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0f1224, 3500, 6500);
const { renderer } = createRenderer(document.getElementById('world'), level, {
  onLost: () => { loop.pause(); document.getElementById('lost').classList.add('on'); },
  onRestored: () => { document.getElementById('lost').classList.remove('on'); loop.resume(); },
});
addLights(scene, renderer);
buildMap(scene, DUEL);
const views = createUnitViews(scene, 0, player.id);
const fx = createFx(scene);
const indicators = createIndicators(scene);
const cam = createCamera({ distance: 2000 });
cam.resize(innerWidth, innerHeight);
addEventListener('resize', () => cam.resize(innerWidth, innerHeight));

const input = createInput(document.body);
const hud = createHud(document.getElementById('hud'), input);
const buttons = createSkillButtons(document.getElementById('skills'), { world, player, indicators });

// bảng thử
const panel = document.getElementById('lab');
panel.innerHTML = `<select id="labHero">${ALPHA.map((id) => `<option value="${id}" ${id === heroId ? 'selected' : ''}>${HEROES[id].name}</option>`).join('')}</select>
  <button id="labCd">Hồi chiêu 0</button><button id="labLv">Lên cấp 15</button><button id="labHeal">Hồi đầy</button>`;
document.getElementById('labHero').onchange = (e) => { q.set('hero', e.target.value); location.search = q.toString(); };
document.getElementById('labCd').onclick = () => world.debug.resetCooldowns(player);
document.getElementById('labLv').onclick = () => world.debug.level15(player);
document.getElementById('labHeal').onclick = () => world.debug.fullHeal(player);
for (const b of panel.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());

const minFrame = 1000 / LEVELS[level].fps - 2;
let lastDraw = 0, fpsAcc = 0, fpsN = 0, fps = 0;

const loop = createLoop({
  update() {
    const d = input.dir();
    world.command(player.id, { type: 'move', dir: { x: d.x, y: d.y } });
    world.update(loop.tick);
  },
  render(alpha, dt) {
    const now = performance.now();
    if (now - lastDraw < minFrame) return;
    lastDraw = now;
    const events = world.drainEvents();
    views.handle(events); fx.handle(events); hud.handle(events, world);
    views.update(world, alpha, dt); fx.update(world, dt);
    buttons.update();
    const px = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha, py = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha;
    const d = input.dir();
    cam.follow(px, py, d.x, d.y, dt);
    renderer.render(scene, cam.camera);
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    const i = renderer.info.render;
    hud.draw(world, cam.camera, player, debug ? [`FPS ${fps}  mức ${level}`, `draw ${i.calls}  tam giác ${i.triangles}`, `tick ${loop.tick}  seed ${seed}`, `pos ${player.pos.x | 0}, ${player.pos.y | 0}  đạn ${world.projectiles.length}`] : null);
  },
});
loop.start();
window.__game = { world, player, loop }; // phục vụ kiểm thử tự động

document.addEventListener('visibilitychange', () => (document.hidden ? loop.pause() : loop.resume()));
document.getElementById('fs').onclick = async () => {
  try { await document.documentElement.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } catch (_) { /* tuỳ thiết bị */ }
};
