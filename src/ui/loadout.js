// Kho bảng bùa / phù hiệu của người chơi (lưu trong hồ sơ, không có DOM): 5 trang mẫu chỉ đọc + tối đa CHARM_PAGE_MAX trang riêng
// (id u1..u10), trang nhớ theo tướng (heroPage), phù hiệu theo tướng (emblems). Mọi lần ghi đều saveProfile(). Dữ liệu đọc ra luôn đi qua
// sanitizePage / sanitizeEmblem nên localStorage hỏng / sửa tay không làm vỡ giao diện hay lọt vào trận.
import { CHARMS, CHARM_PAGES, PAGE_BY_ROLE, CHARM_COLORS, CHARM_SLOTS, CHARM_PAGE_MAX, sanitizePage, cleanName } from '../data/charms.js';
import { EMBLEM_BY_ROLE, sanitizeEmblem } from '../data/emblems.js';
import { HEROES } from '../data/heroes/index.js';
import { profile, saveProfile } from './profile.js';

const ID_RE = /^u([1-9]|10)$/;
const roleOf = (heroId) => HEROES[heroId]?.roles?.[0] || 'fighter';

/** Trang riêng hợp lệ (đã làm sạch), theo thứ tự đã lưu; tự sửa lại hồ sơ nếu có rác. */
export function customPages() {
  const p = profile(), seen = new Set(), out = [];
  for (const raw of Array.isArray(p.charmPages) ? p.charmPages : []) {
    if (!raw || !ID_RE.test(raw.id) || seen.has(raw.id) || out.length >= CHARM_PAGE_MAX) continue;
    const pg = sanitizePage(raw); if (!pg) continue;
    seen.add(raw.id); out.push({ id: raw.id, ...pg });
  }
  p.charmPages = out;
  if (!p.heroPage || typeof p.heroPage !== 'object' || Array.isArray(p.heroPage)) p.heroPage = {};
  if (!p.emblems || typeof p.emblems !== 'object' || Array.isArray(p.emblems)) p.emblems = {};
  return out;
}
const presets = () => Object.keys(CHARM_PAGES).map((id) => ({ id, preset: true, ...sanitizePage(CHARM_PAGES[id]) }));
/** Mọi trang: mẫu trước rồi tới trang riêng. */
export const allPages = () => [...presets(), ...customPages()];
export const pageById = (id) => allPages().find((pg) => pg.id === id) || null;
const custom = (id) => customPages().find((pg) => pg.id === id) || null;
export const isPreset = (id) => !!CHARM_PAGES[id];
/** Trang mặc định của tướng: trang đã nhớ (nếu còn) → trang mẫu theo vai → 'dps'. */
export function defaultPageId(heroId) {
  const p = profile(); customPages();
  const mem = p.heroPage[heroId];
  if (mem && pageById(mem)) return mem;
  return PAGE_BY_ROLE[roleOf(heroId)] || 'dps';
}
/** Tạo trang riêng mới (chép từ `from` nếu có); đã đủ CHARM_PAGE_MAX trang thì trả null. */
export function newPage(from = null) {
  const list = customPages(); if (list.length >= CHARM_PAGE_MAX) return null;
  let n = 1; while (list.some((pg) => pg.id === 'u' + n)) n++;
  const src = from ? pageById(from) || sanitizePage(from) : null;
  const pg = { id: 'u' + n, name: `Trang ${n}` };
  for (const c of CHARM_COLORS) pg[c] = src ? [...src[c]] : Array(CHARM_SLOTS).fill(null);
  profile().charmPages = [...list, pg]; saveProfile();
  return pg;
}
/** id sửa được: trang riêng giữ nguyên; trang mẫu thì tạo bản sao (null nếu hết chỗ). Trả { id, copied }. */
export function editable(id) {
  if (custom(id)) return { id, copied: false };
  if (!isPreset(id)) return { id: null, copied: false };
  const pg = newPage(id); return { id: pg?.id ?? null, copied: !!pg };
}
const edit = (id, fn) => { const pg = custom(id); if (!pg) return false; fn(pg); profile().charmPages = customPages().map((x) => (x.id === id ? pg : x)); saveProfile(); return true; };
/** Gắn / gỡ (charmId null) một ô; bùa sai màu bị từ chối. */
export const setSlot = (id, color, i, charmId) => (charmId && CHARMS[charmId]?.color !== color) || i < 0 || i >= CHARM_SLOTS ? false : edit(id, (pg) => { pg[color][i] = charmId || null; });
export const fillColor = (id, color, charmId) => (CHARMS[charmId]?.color !== color ? false : edit(id, (pg) => { pg[color] = Array(CHARM_SLOTS).fill(charmId); }));
export const clearPage = (id) => edit(id, (pg) => { for (const c of CHARM_COLORS) pg[c] = Array(CHARM_SLOTS).fill(null); });
export const renamePage = (id, name) => edit(id, (pg) => { pg.name = cleanName(name); });
/** Xoá trang riêng (và mọi chỗ tướng đang nhớ trang đó). */
export function deletePage(id) {
  if (!custom(id)) return false;
  const p = profile(); p.charmPages = customPages().filter((pg) => pg.id !== id);
  for (const [h, pid] of Object.entries(p.heroPage)) if (pid === id) delete p.heroPage[h];
  saveProfile(); return true;
}
/** Nhớ trang vừa dùng cho tướng. */
export function rememberPick(heroId, pageId) { const p = profile(); customPages(); if (pageById(pageId)) { p.heroPage[heroId] = pageId; saveProfile(); } }
/** Trang đưa vào mô phỏng (bản sạch, không id). */
export function resolvePage(id) { const pg = pageById(id) || pageById('dps'); const { name, red, blue, gray } = pg; return { name, red: [...red], blue: [...blue], gray: [...gray] }; }

/** Phù hiệu của tướng (đã làm sạch; chưa chỉnh thì mặc định theo vai). */
export function emblemFor(heroId) { const p = profile(); customPages(); return sanitizeEmblem(p.emblems[heroId], roleOf(heroId)); }
export function setEmblem(heroId, em) { const p = profile(); customPages(); p.emblems[heroId] = sanitizeEmblem(em, roleOf(heroId)); saveProfile(); return p.emblems[heroId]; }
export const resetEmblem = (heroId) => setEmblem(heroId, EMBLEM_BY_ROLE[roleOf(heroId)] || EMBLEM_BY_ROLE.fighter);

/** Trang bùa đang dùng: trang chọn trong phiên này (nếu còn) → trang nhớ theo tướng → mẫu theo vai. */
export const pageFor = (chosen, heroId) => (chosen && pageById(chosen) ? chosen : defaultPageId(heroId));
/** Chốt trước trận: nhớ trang theo tướng, trả phần gói vào S.pick ({ charmId, charm, emblem }). */
export function finishLoadout(heroId, pageId) {
  const pid = pageFor(pageId, heroId); rememberPick(heroId, pid);
  return { charmId: pid, charm: resolvePage(pid), emblem: emblemFor(heroId) };
}
