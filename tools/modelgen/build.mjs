// Sinh assets/heroes/<id>/<id>.glb + hero.art.json cho từng tướng.
// Dùng: node build.mjs [id ...]   (không truyền id = build tất cả)
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildClips } from './anim.mjs';
import { HEROES } from './heroes/index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, '../../assets/heroes');
const only = process.argv.slice(2);

const report = [];
for (const [id, def] of Object.entries(HEROES)) {
  if (only.length && !only.includes(id)) continue;
  const ctx = def.build(id);
  const { m } = ctx;
  m.glowColor = def.glow || '#ffffff';
  m.userData = { name: def.name, height: ctx.H };
  const built = m.build();
  const clips = buildClips(ctx, built.bones, def.anim || {});
  const exporter = new GLTFExporter();
  const scene = new THREE.Scene();
  scene.add(built.root);
  const glb = await exporter.parseAsync(scene, { binary: true, animations: Object.values(clips), onlyVisible: false });
  const dir = path.join(outRoot, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.glb`), Buffer.from(glb));
  const art = {
    model: `${id}.glb`, scale: 100, height: Math.round(ctx.H * 100), runRefSpeed: ctx.runRefSpeed,
    hitTime: def.hitTime || { Attack1: 0.28, Attack2: 0.28 },
    attach: { weapon_tip: 'Bone_HandR_Tip', head: 'Bone_Head', ...(def.attach || {}) },
    rim: def.rim || def.palette?.[1] || '#ffffff', palette: def.palette || [],
    clips: Object.keys(clips), generator: 'tools/modelgen',
  };
  fs.writeFileSync(path.join(dir, 'hero.art.json'), JSON.stringify(art, null, 2) + '\n');
  report.push({ id, tris: built.tris, bones: built.bones.length, kb: Math.round(glb.byteLength / 1024), mats: built.mesh.material.length, runRef: ctx.runRefSpeed });
  console.log(`${id.padEnd(10)} tris ${String(built.tris).padStart(6)}  bones ${String(built.bones.length).padStart(3)}  ${String(Math.round(glb.byteLength / 1024)).padStart(5)} KB  runRef ${ctx.runRefSpeed}`);
}
fs.writeFileSync(path.join(here, 'last-report.json'), JSON.stringify(report, null, 2));
