// Sinh bảng tổng hợp tướng (docs/TONG_HOP_TUONG.md) từ dữ liệu thật: src/data/heroes, assets/heroes, docs/04, docs/09.
// Chạy ở gốc repo: node tools/hero_catalog.mjs   (ảnh model: docs/previews/heroes/<id>.jpg, chụp bằng tools/modelgen/shot.cjs)
import fs from 'node:fs';
import { HEROES, ALPHA } from '../src/data/heroes/index.js';
import { ITEMS } from '../src/data/items.js';
import { SPELLS } from '../src/data/spells.js';

const doc04 = fs.readFileSync('docs/04_TUONG.md', 'utf8');
const doc09 = fs.readFileSync('docs/09_HINH_ANH.md', 'utf8');
const ROLE = { tank: 'Đỡ đòn', fighter: 'Đấu sĩ', assassin: 'Sát thủ', mage: 'Pháp sư', marksman: 'Xạ thủ', support: 'Trợ thủ' };
const LANE = { temple: 'Đền', jungle: 'Rừng', mid: 'Giữa', river: 'Sông', support: 'Hỗ trợ' };
const DMG = { physical: 'VL', magic: 'P', true: 'C' };
const ST = { slow: 'chậm', stun: 'choáng', root: 'trói', knockup: 'hất tung', knockback: 'đẩy lùi', pull: 'kéo', silence: 'câm lặng', taunt: 'khiêu khích', haste: 'tăng tốc', stealth: 'tàng hình', dot: 'sát thương theo thời gian', cleanse: 'xoá khống chế', interrupt: 'cắt chiêu', silenceDash: 'cấm lướt', statMod: 'đổi chỉ số' };

// Mô tả ngoại hình model cho 14 tướng đợt 2 (đọc từ tools/modelgen/heroes/<id>.mjs, chưa có trong docs/09).
const LOOK2 = {
  hanh_hoa: 'Thầy lang nữ áo kem/vàng mai, bầu thuốc xanh đeo hông, ba cặp kim châm trên ngực, đấm tay không.',
  tieu_anh: 'Cậu bé thấp (1.5 m), mũ giấy hình nón, phi tiêu giấy lớn đeo sau lưng, vài phân thân giấy nhỏ bên cạnh.',
  ba_nam: 'Bà nội trợ, lô uốn tóc hai bên, lông mày cau, chảo lớn tay phải, chiếc dép tay trái.',
  cau_may: 'Chàng trai áo trắng–xanh, cánh sếu lông vũ trên lưng, quả cầu mây (đế xu + lông) bay cạnh chân phải.',
  bong_den: 'Nghệ nhân rối bóng tím–cam, mặt nạ che mắt, đèn nhỏ trên đầu, hai con rối da trên que tre, bóng đen trôi quanh.',
  thay_do: 'Ông đồ áo the xanh đen, khăn xếp, bút lông khổng lồ, cuộn giấy đeo sau lưng.',
  kep_cheo: 'Kép chèo áo đỏ–vàng–lục, mũ chèo vàng viền đỏ cắm 3 lông trĩ, tay áo múa dài (thuỷ tụ).',
  meo_than_tai: 'Mèo vàng đứng hai chân (1.35 m), vòng cổ đỏ + chuông, thỏi vàng trên đầu, túi bụng, đuôi mèo, đồng hồ cát tay trái.',
  phu_dong: 'Chàng trai cao 2.2 m, mũ sắt tròn, giáp ngực tròn, roi sắt dài lưỡi lửa; tay lửa, tay băng.',
  thu_linh: 'Nàng áo xanh lam viền vàng, bút cài tóc, cuốn sách cổ mở lơ lửng, vòng chữ phát sáng.',
  kiem_thuy: 'Kiếm sĩ băng đô xanh, áo khoác trắng viền sóng nước tà dài, kiếm thẳng lưỡi xanh nước, bọt nước quanh chân.',
  luong_cuc: 'Đạo sĩ mũ đạo cao đen, mặt nạ gỗ đội trán, áo chia nửa đen nửa trắng có biểu tượng âm dương, hai quả cầu Âm (đỏ→đen) và Dương (xanh→trắng) trên tay.',
  nhan_su: 'Thợ săn mũ trùm xanh rêu, một mắt thấu nhãn phát sáng ngọc, hai nỏ ngắn hai nòng ở hai tay.',
  trang_nhi: 'Thám tử nhí (1.35 m), mũ lưỡi trai, giày lực phát sáng, đồng hồ kim ở cổ tay trái, kính lúp lớn tay phải, ván trượt sau lưng.',
};
const ORDER2 = ['hanh_hoa', 'tieu_anh', 'ba_nam', 'cau_may', 'bong_den', 'thay_do', 'kep_cheo', 'meo_than_tai', 'phu_dong', 'thu_linh', 'kiem_thuy', 'luong_cuc', 'nhan_su', 'trang_nhi'];
const QUEUE = ['trau_dong', 'co_thu', 'kiem_may', 'soi_nui', 'doi_dem', 'sam_trong', 'hoa_doc', 'phao_hoa', 'trang_no', 'moc_cam'];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const arr = (v) => (Array.isArray(v) ? (new Set(v).size === 1 ? `${v[0]}` : v.join('/')) : `${v}`);
const item = (id) => (ITEMS[id] ? ITEMS[id].name : `⚠️\`${id}\` (không có trong items.js)`);

function dmgText(d) {
  if (!d) return '';
  const p = [`${d.base}${d.perLevel ? ` (+${d.perLevel}/cấp)` : ''}`];
  if (d.ad) p.push(`${d.ad} Công`);
  if (d.ap) p.push(`${d.ap} Phép`);
  if (d.hpPct) p.push(`${pct(d.hpPct)} HP tối đa`);
  return `${p.join(' + ')} ${DMG[d.type] || d.type}`;
}
const scale = (s) => (s ? `${s.base}${s.perLevel ? ` (+${s.perLevel}/cấp)` : ''}${s.ad ? ` + ${s.ad} Công` : ''}${s.ap ? ` + ${s.ap} Phép` : ''}${s.duration ? ` trong ${s.duration}s` : ''}` : '');
function effText(list) {
  return (list || []).map((e) => {
    const n = ST[e.status] || e.status, x = [];
    if (e.pct) x.push(pct(e.pct));
    if (e.dist) x.push(`${e.dist}`);
    if (e.dps) x.push(`${e.dps}/s`);
    if (e.duration != null) x.push(`${arr(e.duration)}s`);
    if (e.label) x.push(e.label);
    if (e.atEnd) x.push('khi hết thời gian');
    if (e.status === 'statMod') for (const [k, v] of Object.entries(e)) if (!['status', 'id', 'duration'].includes(k)) x.unshift(`${k} ${typeof v === 'number' && v < 1 && v > 0 ? `+${pct(v)}` : arr(v)}`);
    return `${n}${x.length ? ` ${x.join(' ')}` : ''}`;
  }).join(', ');
}
function geom(s) {
  const g = [];
  if (s.range) g.push(`tầm ${s.range}`);
  if (s.radius) g.push(`bán kính ${s.radius}`);
  if (s.width) g.push(`rộng ${s.width}`);
  if (s.angle) g.push(`góc ${s.angle}°`);
  if (s.delay) g.push(`trễ ${s.delay}s`);
  if (s.duration) g.push(`kéo dài ${s.duration}s`);
  if (s.speed) g.push(`tốc đạn ${s.speed}`);
  return g.join(', ');
}
function skillMd(key, s) {
  const lab = { s1: 'K1', s2: 'K2', s3: 'K3 (chiêu cuối)' }[key];
  const L = [`- **${lab} – ${s.name}** \`${s.id}\` · kiểu \`${s.type}\`${geom(s) ? ` · ${geom(s)}` : ''}`,
    `  - Hồi chiêu: ${arr(s.cooldown)}s · Tiêu hao: ${arr(s.cost)} mana`];
  if (s.damage) L.push(`  - Sát thương: ${dmgText(s.damage)}`);
  if (s.heal) L.push(`  - Hồi máu: ${scale(s.heal)}`);
  if (s.shield) L.push(`  - Khiên: ${scale(s.shield)}`);
  if (s.allyShield) L.push(`  - Khiên đồng minh: ${scale(s.allyShield)}`);
  if (s.ambush) L.push(`  - Đòn phục kích: ${s.ambush.base} (+${s.ambush.perLevel}/cấp) + ${s.ambush.adBonus} Công thêm VL, chậm ${pct(s.ambush.slow)} ${s.ambush.slowDuration}s`);
  const ef = [effText(s.effects), s.selfEffects && `bản thân: ${effText(s.selfEffects)}`, s.allyEffects && `đồng minh: ${effText(s.allyEffects)}`].filter(Boolean).join('; ');
  if (ef) L.push(`  - Hiệu ứng: ${ef}`);
  if (s.requires) L.push(`  - Điều kiện: ${s.requires}`);
  if (s.desc) L.push(`  - Mô tả: ${s.desc}`);
  return L.join('\n');
}
function glbInfo(id) {
  const f = `assets/heroes/${id}/${id}.glb`;
  if (!fs.existsSync(f)) return null;
  const b = fs.readFileSync(f), n = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + n));
  let tris = 0;
  for (const m of j.meshes) for (const p of m.primitives) tris += (p.indices != null ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count) / 3;
  const art = JSON.parse(fs.readFileSync(`assets/heroes/${id}/hero.art.json`, 'utf8'));
  return { kb: Math.round(b.length / 1024), tris: Math.round(tris), bones: j.skins?.[0]?.joints.length || 0, mats: j.materials?.length || 0, tex: j.images?.length || 0, clips: j.animations.map((a) => a.name), art };
}
function modelMd(id, look) {
  const g = glbInfo(id);
  if (!g) return '- **Model:** chưa có.';
  const a = g.art, src = a.source ? `model nhập (\`tools/modelgen/imports/${a.source}\`, có texture, ${g.tex} ảnh)` : `sinh bằng code (\`tools/modelgen/heroes/${id}.mjs\`, màu theo đỉnh, chưa texture)`;
  return [
    `![${id}](previews/heroes/${id}.jpg)`,
    '',
    `- **Ngoại hình model:** ${look}`,
    `- **File:** \`assets/heroes/${id}/${id}.glb\` (${g.kb} KB) · ${src}`,
    `- **Thông số:** ${g.tris.toLocaleString('en')} tam giác · ${g.bones} xương · ${g.mats} vật liệu · cao ${a.height} cm · runRefSpeed ${a.runRefSpeed}`,
    `- **Màu:** viền sáng \`${a.rim}\` · bảng màu ${a.palette.map((c) => `\`${c}\``).join(' ')}`,
    `- **Clip (${g.clips.length}):** ${g.clips.join(', ')}`,
  ].join('\n');
}
// Đoạn văn trong docs theo tiêu đề ### n.m
function section(doc, num) {
  const i = doc.indexOf(`### ${num} `);
  if (i < 0) return '';
  const j = doc.indexOf('\n#', i + 4);
  return doc.slice(i, j < 0 ? undefined : j).trim();
}
const lookOf09 = (num) => { const s = section(doc09, num); const m = s.match(/\*\*Ngoại hình:\*\* (.*)/), w = s.match(/\*\*Vũ khí:\*\* (.*)/); return `${m ? m[1] : ''}${w ? ` Vũ khí: ${w[1]}` : ''}`; };
const NUM = { thach_quy: '1', trau_dong: '2', co_thu: '3', hoa_ren: '4', kiem_may: '5', soi_nui: '6', bong_tre: '7', doi_dem: '8', nguyet_ha: '9', sam_trong: '10', hoa_doc: '11', canh_dieu: '12', phao_hoa: '13', trang_no: '14', long_dang: '15', moc_cam: '16' };

function statsRow(h) {
  const b = h.base, p = h.perLevel;
  return `| HP ${b.maxHp} (+${p.maxHp}) | Mana ${b.maxMana} (+${p.maxMana}) | Công ${b.atk} (+${p.atk}) | Giáp ${b.armor} (+${p.armor}) | KP ${b.mr} (+${p.mr}) | Tốc đánh ${b.atkSpeed} (+${pct(p.atkSpeedPct)}/cấp) | Chạy ${b.moveSpeed} | Tầm ${b.range} |`;
}
function heroMd(id, n, status, look) {
  const h = HEROES[id];
  const L = [`### ${n}. ${h.name} — "${h.title}" \`${id}\``, '',
    `**Trạng thái:** ${status} · **Vai:** ${h.roles.map((r) => ROLE[r]).join(' / ')} · **Đường:** ${h.lanes.map((l) => LANE[l]).join(', ')} · **Độ khó:** ${'★'.repeat(h.difficulty)} · **Đánh thường:** ${h.basicAttack?.melee ? 'cận chiến' : `đạn bay (tốc ${h.basicAttack?.projectile?.speed}${h.basicAttack?.projectile?.vfx ? `, vfx \`${h.basicAttack.projectile.vfx}\`` : ''})`}`, ''];
  if (h.origin) L.push(`*${h.origin}*`, '');
  L.push('| | | | | | | | |', '|---|---|---|---|---|---|---|---|', statsRow(h), '');
  L.push(`- **Nội tại – ${h.passive.name}** \`${h.passive.id}\`: ${h.passive.desc}`);
  for (const k of ['s1', 's2', 's3']) L.push(skillMd(k, h.skills[k]));
  L.push(`- **Bot:** combo ${h.ai.combo.map((k) => k.toUpperCase().replace('S', 'K')).join(' → ')} · giữ cự ly ${h.ai.preferredRange} · vào giao tranh khi HP ≥ ${pct(h.ai.engageHpRatio)}${h.ai.ultRule ? ` · luật chiêu cuối \`${h.ai.ultRule}\`` : ''}`);
  L.push(`- **Phép mặc định:** ${SPELLS[h.defaultSpell]?.name || h.defaultSpell} · **Build:** ${h.recommendedBuild.map(item).join(' → ')}`);
  L.push('', modelMd(id, look), '');
  return L.join('\n');
}
function queueMd(id, n) {
  const sec = section(doc04, `6.${NUM[id]}`).split('\n');
  const head = sec[0].replace(/^### 6\.\d+ /, '');
  const row = doc04.split('\n').find((l) => l.startsWith(`| ${id} |`)).split('|').map((x) => x.trim());
  return [`### ${n}. ${head} \`${id}\``, '',
    `**Trạng thái:** ⏳ Hàng chờ — có thiết kế (docs/04 §6.${NUM[id]}) + model 3D, **chưa có file dữ liệu** \`src/data/heroes/${id}.js\` · **Vai:** ${row[3]} · **Đường:** ${row[4]} · **Độ khó:** ${row[5]}`, '',
    '| | | | | | | | |', '|---|---|---|---|---|---|---|---|',
    `| HP ${row[6]} (+${row[7]}) | Mana ${row[8]}${row[9] !== '–' ? ` (+${row[9]})` : ''} | Công ${row[10]} (+${row[11]}) | Giáp ${row[12]} (+${row[13]}) | KP ${row[14]} (+${row[15]}) | Tốc đánh ${row[16]} (+${row[17]}/cấp) | Chạy ${row[18]} | Tầm ${row[19]} |`, '',
    ...sec.slice(1), '', modelMd(id, lookOf09(`4.${NUM[id]}`)), ''].join('\n');
}

const live = ALPHA, soon = ORDER2;
const lookAlpha = (id) => (id === 'thach_quy'
  ? 'Thợ lặn canh đền chìm: bộ đồ lặn đồng thau, mũ lặn tròn, bình dưỡng khí sau lưng, vác ống đồng dài làm vũ khí (⚠️ khác mô tả "rùa đá" cũ trong docs/09 §4.1).'
  : lookOf09(`4.${NUM[id]}`));
const out = [];
out.push('# Tổng hợp tướng — tên, kỹ năng, model', '',
  `> Sinh tự động bằng \`node tools/hero_catalog.mjs\` từ \`src/data/heroes/\`, \`assets/heroes/\`, \`docs/04_TUONG.md\`, \`docs/09_HINH_ANH.md\`. Sửa dữ liệu gốc rồi chạy lại script, đừng sửa tay file này.`,
  '> Ảnh: trái = mặt trước, phải = mặt bên, tư thế Idle, chụp từ file GLB trong game (`tools/modelgen/shot.cjs`). Mặt của các model sinh bằng code hiện trắng trong ảnh chụp từ trang kiểm tra model.', '',
  '![Toàn bộ 30 tướng](previews/heroes_all.jpg)', '',
  '## 0. Tóm tắt', '',
  '| Nhóm | Số tướng | Ý nghĩa |', '|---|---|---|',
  `| ✅ Hiện có (chơi được) | ${live.length} | Có dữ liệu + engine chạy đủ nội tại/kỹ năng, có trong màn chọn tướng, 1v1 và 5v5 (\`ALPHA\` trong \`src/data/heroes/index.js\`). |`,
  `| 🔜 Sắp có | ${soon.length} | Đã có file dữ liệu + model, hiện trong lưới chọn tướng nhưng **bị khoá**; cơ chế riêng (\`params\`) mới khai báo, engine làm ở Mốc 10. |`,
  `| ⏳ Hàng chờ | ${QUEUE.length} | Chỉ có thiết kế trong docs/04 §6 + model 3D; **chưa có file dữ liệu**. |`,
  `| **Tổng** | **${live.length + soon.length + QUEUE.length}** | 30 model GLB trong \`assets/heroes/\`. |`, '',
  '| # | id | Tên | Danh hiệu | Vai | Đường | Khó | Trạng thái |', '|---|---|---|---|---|---|---|---|');
let n = 0;
for (const id of live) { const h = HEROES[id]; out.push(`| ${++n} | \`${id}\` | ${h.name} | ${h.title} | ${h.roles.map((r) => ROLE[r]).join(' / ')} | ${h.lanes.map((l) => LANE[l]).join(', ')} | ${'★'.repeat(h.difficulty)} | ✅ Hiện có |`); }
for (const id of soon) { const h = HEROES[id]; out.push(`| ${++n} | \`${id}\` | ${h.name} | ${h.title} | ${h.roles.map((r) => ROLE[r]).join(' / ')} | ${h.lanes.map((l) => LANE[l]).join(', ')} | ${'★'.repeat(h.difficulty)} | 🔜 Sắp có |`); }
for (const id of QUEUE) {
  const row = doc04.split('\n').find((l) => l.startsWith(`| ${id} |`)).split('|').map((x) => x.trim());
  const t = section(doc04, `6.${NUM[id]}`).match(/"(.*)"/)[1];
  out.push(`| ${++n} | \`${id}\` | ${row[2]} | ${t} | ${row[3]} | ${row[4]} | ${row[5]} | ⏳ Hàng chờ |`);
}
out.push('', 'Ký hiệu: **VL** vật lý · **P** phép · **C** chuẩn. `80 (+40/cấp) + 0.7 Phép` = 80 + 40 × (cấp kỹ năng − 1) + 0.7 × Sức mạnh phép. Hồi chiêu/tiêu hao ghi theo cấp kỹ năng (K1, K2: 6 cấp; K3: 3 cấp).', '');

out.push('## 1. Cần sửa / chưa khớp (phát hiện khi tổng hợp)', '');
const issues = [];
const bad = {};
for (const [id, h] of Object.entries(HEROES)) for (const it of h.recommendedBuild) if (!ITEMS[it]) (bad[it] ||= []).push(id);
issues.push(`**Build trỏ tới đồ không tồn tại** trong \`src/data/items.js\` (bị \`cleanBuild\` lọc bỏ âm thầm): ${Object.entries(bad).map(([it, ids]) => `\`${it}\` (${ids.join(', ')})`).join('; ')}.`);
issues.push('**Mossback (`thach_quy`)**: code + model đã đổi sang "thợ lặn" (Móc Neo / Dậm Áp Suất / Xoáy Nước Sâu, nội tại Bình Dưỡng Khí) nhưng docs/04 §6.1 vẫn ghi bộ cũ (Mai Đá / Húc Núi / Chấn Địa / Đền Thiêng) và docs/09 §4.1 vẫn tả "rùa đá khổng lồ".');
issues.push('**Tên không đồng bộ**: 6 tướng Alpha dùng tên tiếng Anh (Emberforge, Mossback, Bamboo Shade, Moonstream, Kitewing, Lanternward), 24 tướng còn lại tên tiếng Việt. id vẫn tiếng Việt (`hoa_ren`, `thach_quy`…).');
issues.push('**Mèo Thần Tài**: danh hiệu trong data là "Mèo Vẫy Tay Bảo Bối", trong `tools/modelgen/heroes/meo_than_tai.mjs` là "Mèo Vẫy Tay Chiêu Tài".');
issues.push('**Build khác docs/04**: Mossback, Bamboo Shade, Kitewing, Lanternward có build trong code khác build ghi trong docs/04 §6 (code là nguồn đang chạy).');
issues.push('**docs/PROGRESS.md**: bảng thông số model chỉ có 16 tướng gốc; 14 model đợt 2 chưa được ghi. Số liệu 3 model nhập (Mossback, Emberforge, Bamboo Shade) đã thay đổi so với bảng.');
issues.push('**Model đợt 2 (14 tướng)** còn ở dạng khối nguyên thuỷ tô màu đỉnh, chưa có mặt chi tiết/texture như 3 model nhập; nên ưu tiên làm lại khi mở khoá.');
issues.push('**Hàng chờ (10 tướng)**: cần tạo `src/data/heroes/<id>.js` (dùng khuôn `hero()` trong `_make.js`) và thêm vào `HEROES` trong `index.js`; Kiếm Mây và Sói Núi dùng tài nguyên "Không" (không mana) — khuôn `_make.js` hiện mặc định `resource: \'mana\'`.');
out.push(...issues.map((s, i) => `${i + 1}. ${s}`), '');

n = 0;
out.push('## 2. ✅ Tướng hiện có (6)', '');
for (const id of live) out.push(heroMd(id, ++n, '✅ Hiện có', lookAlpha(id)));
out.push('## 3. 🔜 Tướng sắp có (14)', '');
// Nhân vật gốc bên autobattle mà mỗi tướng đợt 2 lấy cơ chế (chỉ cơ chế; tên, ngoại hình, tên chiêu là nội dung gốc — 04 §8).
const ORIGIN = { hanh_hoa: 'Sakura (Naruto)', tieu_anh: 'Konohamaru (Naruto)', ba_nam: 'ChiChi (Dragon Ball)', cau_may: 'Tsubasa (Captain Tsubasa)', bong_den: 'Shikamaru (Naruto)', thay_do: 'Suzune', kep_cheo: 'Ginyu (Dragon Ball)', meo_than_tai: 'Doraemon', phu_dong: 'Superman', thu_linh: 'Beatrice (Re:Zero)', kiem_thuy: 'Tanjiro (Thanh Gươm Diệt Quỷ)', luong_cuc: 'Gojo (Jujutsu Kaisen)', nhan_su: 'Isagi (Blue Lock)', trang_nhi: 'Conan (Thám Tử Lừng Danh Conan)' };
out.push('**Ghi chú — nguồn cơ chế.** 14 tướng này lấy cơ chế từ các đấu thủ bên repo autobattle. Chỉ lấy cơ chế; tên, ngoại hình và tên chiêu phải là nội dung gốc (docs/04 §8), khi sửa model hay mô tả đừng để lộ nét nhân vật gốc.', '',
  '| Tướng hiện tại | Nhân vật gốc bên autobattle |', '|---|---|', ...soon.map((id) => `| ${HEROES[id].name} — ${HEROES[id].title} | ${ORIGIN[id]} |`), '');
for (const id of soon) out.push(heroMd(id, ++n, '🔜 Sắp có (khoá trong màn chọn tướng)', LOOK2[id]));
out.push('## 4. ⏳ Tướng trong hàng chờ (10)', '');
for (const id of QUEUE) out.push(queueMd(id, ++n));
fs.writeFileSync('docs/TONG_HOP_TUONG.md', out.join('\n'));
console.log('docs/TONG_HOP_TUONG.md', out.length, 'dòng');
