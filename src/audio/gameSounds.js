// Tiếng trong trận: đọc sự kiện mô phỏng (giống render/vfx/library.js) → phát tiếng có vị trí (audio.js). Chỉ phát thứ đội mình đang thấy
// (địch trong sương mù không lộ qua tiếng). Mỗi tướng có bộ tiếng riêng: đánh thường (vung vũ khí nặng/nhẹ hoặc bắn cung/phép), tiếng trúng
// (thịt, chém, giáp, phép) và nguyên tố chiêu (lửa, nước, lá, gió, ánh sáng, huyền bí, đất); chiêu cuối thêm tiếng gầm trầm; chí mạng,
// sát thương chuẩn, đánh vào công trình, trụ bắn có tiếng riêng. Tiếng của chính mình (vàng, lên cấp, mua đồ, hồi sinh…) không vị trí.
import { play, setListener } from './audio.js';

// [vung/bắn khi đánh thường, tiếng trúng, nguyên tố chiêu]
const KIT = {
  hoa_ren: ['swing_heavy', 'hit_flesh', 'fire'], thach_quy: ['swing_heavy', 'hit_flesh', 'water'], bong_tre: ['swing_light', 'hit_slash', 'leaf'],
  nguyet_ha: ['shot_magic', 'hit_magic', 'water'], canh_dieu: ['shot_bow', 'hit_flesh', 'wind'], long_dang: ['shot_magic', 'hit_magic', 'light'],
  hanh_hoa: ['swing_light', 'hit_flesh', 'leaf'], tieu_anh: ['shot_bow', 'hit_slash', 'arcane'], ba_nam: ['swing_heavy', 'hit_armor', 'earth'],
  cau_may: ['shot_bow', 'hit_flesh', 'wind'], bong_den: ['shot_magic', 'hit_magic', 'arcane'], thay_do: ['swing_light', 'hit_flesh', 'light'],
  kep_cheo: ['swing_light', 'hit_slash', 'light'], meo_than_tai: ['swing_heavy', 'hit_flesh', 'wind'], phu_dong: ['swing_heavy', 'hit_armor', 'earth'],
  thu_linh: ['shot_magic', 'hit_magic', 'arcane'], kiem_thuy: ['swing_light', 'hit_slash', 'water'], luong_cuc: ['shot_magic', 'hit_magic', 'arcane'],
  nhan_su: ['shot_bow', 'hit_slash', 'wind'], trang_nhi: ['shot_bow', 'hit_flesh', 'wind'],
};
const kitOf = (e) => KIT[e.heroId] || (e.data?.basicAttack?.melee ? ['swing_light', 'hit_flesh', 'arcane'] : ['shot_magic', 'hit_magic', 'arcane']);
const SKILL = new Set(['s1', 's2', 's3']);
const SPELL = { hoi_phuc: ['heal'], tram_hon: ['arcane_hit', 0.8], gio_luot: ['haste'], giai_troi: ['cleanse'] }; // Chớp Bước / Trừng Trị: sự kiện blink / smite

export function createGameSounds({ team, me }) {
  let world = null, hornDone = false;
  const ent = (id) => (id == null ? null : world.byId(id));
  const seen = (e) => !!e && (e.team === team || !!e.seenBy?.[team] || e.structure);
  const at = (e, o = {}) => (e?.pos ? { x: e.pos.x, y: e.pos.y, ...o } : o);
  const lastAt = new Map(); // khoá → giây: chống dồn tiếng của cùng một nguồn (đòn trúng một mục tiêu, chiêu vùng gây sát thương nhiều lần)
  const once = (key, gap) => { const t = performance.now() / 1000; if (t - (lastAt.get(key) ?? -9) < gap) return false; lastAt.set(key, t); return true; };
  const recalls = new Map(), vis = new Set(); // vis: đơn vị đội mình thấy ở khung trước (đơn vị chết thì vision đánh dấu "thấy" — không dùng được)
  const mine = (id) => id === me;

  function damage(ev) {
    const t = ent(ev.id), s = ent(ev.src); if (!t || !seen(t) || ev.amount < 5) return;
    const vol = mine(ev.id) || mine(ev.src) ? 1 : 0.8;
    if (s?.kind === 'tower' || s?.kind === 'core') { play('tower_hit', at(t, { vol })); return; }
    if (SKILL.has(ev.slot) && s?.kind === 'hero') { if (once(`k${s.id}${ev.slot}`, 0.3)) play(kitOf(s)[2] + '_hit', at(t, { vol })); return; }
    if (ev.slot === 'spell' || ev.slot === 'item' || ev.slot === 'boss') return; // phép bổ trợ / đồ / boss: tiếng ở sự kiện riêng
    if (!ev.crit && !once('h' + t.id, 0.06)) return;
    if (ev.shield) { play('hit_armor', at(t, { vol: vol * 0.5 })); return; }
    if (t.structure) { play(s?.kind === 'minion' ? 'hit_minion' : 'hit_armor', at(t, { vol: s?.kind === 'minion' ? 0.5 : vol })); return; }
    if (ev.crit) { play('hit_crit', at(t, { vol })); return; }
    if (ev.dmgType === 'true') { play('hit_true', at(t, { vol })); return; }
    if (s?.kind === 'hero') play(ev.dmgType === 'magic' ? 'hit_magic' : kitOf(s)[1], at(t, { vol }));
    else if (s?.kind === 'minion') play('hit_minion', at(t, { vol: t.kind === 'hero' ? 0.8 : 0.55 }));
    else if (s?.kind === 'monster') play('hit_flesh', at(t, { vol: 0.6, rate: 0.85 }));
  }

  function attack(ev) {
    const e = ent(ev.id); if (!e || !seen(e)) return;
    const d = ev.delay ?? 0.3;
    if (e.kind === 'hero') { const [w] = kitOf(e), melee = w.startsWith('swing'); play(w, at(e, { delay: Math.max(0, d - (melee ? 0.08 : 0.02)), vol: mine(e.id) ? 1 : 0.85 })); }
    else if (e.kind === 'minion') {
      const t = e.minionType;
      if (t === 'archer') play('shot_minion', at(e, { delay: Math.max(0, d - 0.05) }));
      else if (t === 'siege') play('shot_magic', at(e, { delay: Math.max(0, d - 0.05), vol: 0.4, rate: 0.6 }));
      else play('swing_light', at(e, { delay: Math.max(0, d - 0.08), vol: t === 'giant' ? 0.5 : 0.3, rate: t === 'giant' ? 0.8 : 1.1 }));
    } else if (e.kind === 'monster') play('swing_heavy', at(e, { delay: Math.max(0, d - 0.1), vol: 0.55, rate: 0.8 }));
  }

  function handle(ev) {
    switch (ev.type) {
      case 'attack': attack(ev); break;
      case 'damage': damage(ev); break;
      case 'towerShot': { const s = ent(ev.id); if (s) play('tower_shot', at(s, { vol: mine(ev.target) ? 1 : 0.75 })); break; }
      case 'cast': {
        const e = ent(ev.id); if (!e || e.kind !== 'hero' || !seen(e)) break;
        const el = kitOf(e)[2], o = at(e, { delay: Math.max(0, (ev.delay || 0) - 0.05) });
        play(el + '_cast', o);
        if (ev.slot === 's3') play('ult_cast', at(e));
        if (ev.skillType === 'dash' || ev.skillType === 'targetedDash') play('dash', o);
        break;
      }
      case 'aoe': case 'impact': {
        if (ev.warn || ev.zone) break;
        if (ev.slot === 'boss') { play('slam', { x: ev.x, y: ev.y }); break; }
        const e = ent(ev.id); if (!e || e.kind !== 'hero' || !seen(e)) break;
        const el = kitOf(e)[2];
        if (once(`k${e.id}${ev.slot}`, 0.3)) play(ev.type === 'impact' && (el === 'earth' || el === 'fire') ? 'slam' : el + '_hit', { x: ev.x, y: ev.y });
        break;
      }
      case 'hook': case 'jump': { const e = ent(ev.id); if (seen(e)) play('dash', at(e)); break; }
      case 'blink': { const e = ent(ev.id); if (seen(e)) play('blink', ev.from ? { x: ev.from.x, y: ev.from.y } : at(e)); break; }
      case 'spell': { const e = ent(ev.id), s = SPELL[ev.spell]; if (s && seen(e)) play(s[0], at(e, { rate: s[1] })); break; }
      case 'smite': play('smite', { x: ev.x, y: ev.y }); break;
      case 'restore': { const e = ent(ev.id); if (seen(e)) play('restore', at(e)); break; }
      case 'restoreBreak': { const e = ent(ev.id); if (seen(e)) play('restore_break', at(e)); break; }
      case 'shield': { const e = ent(ev.id); if (e?.kind === 'hero' && seen(e) && ev.amount >= 60 && once('sh' + e.id, 1)) play('shield', at(e)); break; }
      case 'status': { const e = ent(ev.id); if ((ev.kind === 'stun' || ev.kind === 'taunt' || ev.kind === 'root') && seen(e) && once('st' + e.id, 0.4)) play('stun', at(e, { vol: ev.kind === 'root' ? 0.7 : 1 })); break; }
      case 'knockup': { const e = ent(ev.id); if (seen(e)) play('knockup', at(e)); break; }
      case 'death': {
        const e = ent(ev.id); if (!e || !(vis.has(e.id) || e.team === team)) break;
        if (e.kind === 'hero') play('death_hero', at(e, { vol: 1 }));
        else if (e.kind === 'minion') play('death_minion', at(e));
        else if (e.kind === 'monster') play('death_monster', at(e, { rate: e.data?.boss ? 0.8 : 1 }));
        break;
      }
      case 'structureDown': play('tower_down', { vol: 0.85, announce: true }); break; // tin lớn: nghe ở đâu cũng thấy
      case 'monsterKill': if (ev.boss) play('boss_roar', { vol: 0.85, announce: true }); break;
      case 'orbTaken': { const o = world.orbs?.[ev.orb]; if (o && ev.team === team) play('orb', { x: o.x, y: o.y }); break; }
      case 'recallStart': { const e = ent(ev.id); if (seen(e)) recalls.set(ev.id, play('recall_start', at(e))); break; }
      case 'recallCancel': recalls.get(ev.id)?.stop(0.15); recalls.delete(ev.id); break;
      case 'recalled': { recalls.delete(ev.id); const e = ent(ev.id); if (seen(e)) play('recall_end', at(e)); break; }
      case 'itemUse': { // đồ kích hoạt: tiếng theo loại (Xích Giữ dùng tiếng của sự kiện suppress)
        const e = ent(ev.id); if (!seen(e)) break;
        if (ev.act === 'stasis') play('shield', at(e, { rate: 1.3 })); else if (ev.act === 'ward') play('shield', at(e)); else if (ev.act === 'dash') play('dash', at(e));
        else if (ev.act !== 'suppress') play('arcane_cast', at(e, { vol: 0.7, rate: 1.15 }));
        break;
      }
      case 'suppress': { const t = ent(ev.target); if (seen(t)) { play('stun', at(t, { rate: 0.75 })); if (ev.item) play('hit_armor', at(t, { vol: 0.6, rate: 0.7 })); } break; } // áp chế: tiếng khoá trầm (+ tiếng xích kim loại)
      case 'suppressEnd': { const t = ent(ev.target); if (!ev.ok && seen(t)) play('restore_break', at(t, { vol: 0.5 })); break; } // xích đứt sớm
      case 'unstoppable': { const e = ent(ev.id); if (seen(e)) play('haste', at(e, { vol: 0.6, rate: 1.25 })); break; }
      // —— của riêng mình (không vị trí) ——
      case 'gold': if (mine(ev.id)) play(ev.amount >= 150 ? 'coins' : 'coin', { vol: ev.amount >= 150 ? 1 : 0.8 }); break;
      case 'levelup': if (mine(ev.id)) play('levelup'); break;
      case 'buy': if (mine(ev.id)) play('buy'); break;
      case 'sell': if (mine(ev.id)) play('coin'); break;
      case 'buyFail': if (mine(ev.id)) play('ui_error', { vol: 0.6 }); break;
      case 'castFail': if (mine(ev.id) && once('cf', 0.5)) play('ui_error', { vol: 0.4 }); break;
      case 'respawn': case 'revive': if (mine(ev.id)) play('respawn'); break;
      case 'buff': if (mine(ev.id)) play('cleanse', { vol: 0.7 }); break;
      case 'gameover': play(ev.winner === team ? 'victory' : 'defeat', { announce: true }); break;
      default: break;
    }
  }
  return {
    handle(events, w) { world = w; for (const ev of events) handle(ev); },
    /** Mỗi khung: tâm nghe = tâm camera, hướng "phải" của màn hình; tù và khi đợt lính đầu tiên ra trận. */
    update(w, target, camera) {
      world = w;
      const m = camera.matrixWorld.elements; setListener(target.x, target.z, m[0], m[2]);
      if (!hornDone && w.waveNo >= 1) { hornDone = true; play('horn', { announce: true }); }
      vis.clear(); for (const e of w.entities) if (e.alive && seen(e)) vis.add(e.id);
    },
  };
}
