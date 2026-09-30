import * as THREE from 'three';
import { createLoop } from './core/loop.js';
import { DUEL } from './data/maps.js';
import { createWorld } from './sim/world.js';
import { createRenderer } from './render/renderer.js';
import { pickLevel, LEVELS } from './render/quality.js';
import { addLights } from './render/lights.js';
import { createCamera } from './render/camera.js';
import { buildMap } from './render/mapBuilder.js';
import { createUnitViews } from './render/unitView.js';
import { createInput } from './hud/joystick.js';
import { createHud } from './hud/hud.js';

const q = new URLSearchParams(location.search);
const debug = q.has('debug');
const seed = parseInt(q.get('seed') || '1', 10);
const level = pickLevel();

const world = createWorld({ map: DUEL, seed });
const player = world.spawnHero('hoa_ren', 0, DUEL.spawn[0]);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0f1224, 3500, 6500);
const { renderer } = createRenderer(document.getElementById('world'), level, {
  onLost: () => { loop.pause(); document.getElementById('lost').classList.add('on'); },
  onRestored: () => { document.getElementById('lost').classList.remove('on'); loop.resume(); },
});
addLights(scene, renderer);
buildMap(scene, DUEL);
const views = createUnitViews(scene);
const cam = createCamera({ distance: 2000 });
cam.resize(innerWidth, innerHeight);
addEventListener('resize', () => cam.resize(innerWidth, innerHeight));

const input = createInput(document.body);
const hud = createHud(document.getElementById('hud'), input);

// FPS mục tiêu của mức chất lượng: bỏ bớt khung hình vẽ, mô phỏng vẫn 30Hz cố định
const minFrame = 1000 / LEVELS[level].fps - 2;
let lastDraw = 0, fpsAcc = 0, fpsN = 0, fps = 0;

const loop = createLoop({
  update() {
    const d = input.dir(); // màn hình → mặt đất: lên = -z
    world.command(player.id, { type: 'move', dir: { x: d.x, y: d.y } });
    world.update(loop.tick);
  },
  render(alpha, dt) {
    const now = performance.now();
    if (now - lastDraw < minFrame) return;
    lastDraw = now;
    views.update(world, alpha, dt);
    const px = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha, py = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha;
    const d = input.dir();
    cam.follow(px, py, d.x, d.y, dt);
    renderer.render(scene, cam.camera);
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    const i = renderer.info.render;
    hud.draw(debug ? [`FPS ${fps}  mức ${level}`, `draw ${i.calls}  tam giác ${i.triangles}`, `tick ${loop.tick}  seed ${seed}`, `pos ${player.pos.x | 0}, ${player.pos.y | 0}`] : null);
  },
});
loop.start();

// Tạm dừng khi tab ẩn (chế độ offline)
document.addEventListener('visibilitychange', () => (document.hidden ? loop.pause() : loop.resume()));

// Toàn màn hình + khoá ngang
document.getElementById('fs').onclick = async () => {
  try { await document.documentElement.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } catch (_) { /* tuỳ thiết bị */ }
};
