// Kiểm thử luật vị trí + cấm/chọn (thuần logic, không trình duyệt): node tools/t_draft.mjs
import { ALPHA, HEROES } from '../src/data/heroes/index.js';
import { ROLE_IDS } from '../src/data/roles.js';
import { DRAFT, DRAFT_SEQ } from '../src/data/draft.js';
import { mulberry32 } from '../src/core/rng.js';
import { assignSlots } from '../src/sim/lineup.js';
import { HAI_DANG } from '../src/ui/profile.js';
import { fit, recommend, assignRoles, shuffle, choose, teamPicks } from '../src/ui/roles.js';
import { createDraft, startTurn, act, turnDone, isAvail, available, protectedFor, botBan, botPick, autoPick, heroMain, bansPerSide } from '../src/ui/draftRules.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// (1) vị trí khớp sim, mốc Hải Đăng
ok('ROLE_IDS = 5 ô của sim (assignSlots)', same(ROLE_IDS, assignSlots(ALPHA.slice(0, 5)).map((s) => s.lane)), ROLE_IDS.join(','));
ok('DRAFT.fullFromTier = HAI_DANG', DRAFT.fullFromTier === HAI_DANG);

// (2) thứ tự lượt
const count = (seq, act, team) => seq.filter((t) => t.act === act && t.team === team).reduce((s, t) => s + t.n, 0);
for (const [k, bans, total] of [['lite', 2, 14], ['full', 3, 16]]) {
  const S = DRAFT_SEQ[k];
  ok(`${k}: mỗi đội 5 chọn, ${bans} cấm, ${total} tướng`, [0, 1].every((t) => count(S, 'pick', t) === 5 && count(S, 'ban', t) === bans) && S.reduce((s, t) => s + t.n, 0) === total && total <= ALPHA.length && bansPerSide(S) === bans);
}
const str = DRAFT_SEQ.full.map((t) => (t.act === 'ban' ? 'B' + t.team : `P${t.team}x${t.n}`)).join(' ');
ok('full đúng thứ tự 07 §7.3', str === 'B0 B1 B0 B1 P0x1 P1x2 P0x2 P1x1 B1 B0 P1x1 P0x2 P1x1', str);

// (3) mô phỏng nhiều ván: mọi người là máy, người chơi tự khoá tướng đang xem (ngẫu nhiên)
function runDraft(seed, key, meSeat) {
  const rnd = mulberry32(seed).next;
  const D = createDraft({ seq: DRAFT_SEQ[key], roles: [shuffle(ROLE_IDS, rnd), shuffle(ROLE_IDS, rnd)], meSeat });
  const hover = ALPHA[Math.floor(rnd() * ALPHA.length)], log = { protViol: 0, actFail: 0, botPicks: 0, botFit: 0 };
  for (startTurn(D); !D.done; startTurn(D)) {
    for (const a of D.actors) {
      let hero;
      if (a.act === 'ban') { const prot = protectedFor(D, a.team); hero = botBan(D, a.team, rnd, a.team === 0 ? { avoid: [hover] } : {}); if (hero && prot.includes(hero)) log.protViol++; }
      else if (a.me) hero = autoPick(D, 0, a.seat, hover);
      else { hero = botPick(D, a.team, a.seat, rnd, a.team === 0 && D.picks[0][meSeat] == null ? { avoid: [hover] } : {}); log.botPicks++; if (fit(D.roles[a.team][a.seat], hero) >= 1) log.botFit++; }
      if (!act(D, a.team, a.seat, hero).ok) log.actFail++;
    }
    if (!turnDone(D)) log.actFail++;
  }
  return { D, log };
}
let bad = 0, prot = 0, fails = 0, picks = 0, fits = 0, n = 0;
for (let seed = 1; seed <= 300; seed++) for (const key of ['lite', 'full']) for (let me = 0; me < 5; me++) {
  const { D, log } = runDraft(seed * 7919 + me, key, me); n++;
  const all = [...D.picks[0], ...D.picks[1], ...D.bans[0], ...D.bans[1]].filter(Boolean);
  const okDraft = D.picks.every((t) => t.length === 5 && t.every((h) => h && ALPHA.includes(h)) && new Set(t).size === 5) && new Set(all).size === all.length
    && !D.picks.flat().some((h) => D.bans.flat().includes(h)) && D.bans.every((b) => b.length === bansPerSide(DRAFT_SEQ[key]));
  if (!okDraft) bad++; prot += log.protViol; fails += log.actFail; picks += log.botPicks; fits += log.botFit;
}
ok(`${n} ván: đủ 5 tướng khác nhau mỗi đội, không trùng giữa cấm/chọn hai đội, không chọn tướng bị cấm`, bad === 0, `${bad} ván hỏng`);
ok('mọi lượt hợp lệ (act ok, lượt xong đủ người)', fails === 0, String(fails));
ok('máy không bao giờ cấm tướng được bảo vệ của chính đội', prot === 0, String(prot));
ok('≥ 95% tướng máy chọn hợp vị trí (độ hợp ≥ 1)', fits / picks >= 0.95, `${(100 * fits / picks).toFixed(1)}% của ${picks}`);

// (4) tất định theo seed
ok('cùng seed → cùng ván', same(runDraft(42, 'full', 2).D.picks, runDraft(42, 'full', 2).D.picks) && same(runDraft(42, 'lite', 0).D.bans, runDraft(42, 'lite', 0).D.bans));
let diff = 0; for (let s = 1; s <= 100; s++) { const a = runDraft(s, 'lite', 1).D, b = runDraft(s + 1000, 'lite', 1).D; if (!same([a.bans, a.picks], [b.bans, b.picks])) diff++; }
ok('seed khác → ván khác (≥ 90/100)', diff >= 90, String(diff));

// (5) act từ chối sai lượt / tướng đã dùng; bỏ lượt cấm
{
  const D = createDraft({ seq: DRAFT_SEQ.lite, roles: [ROLE_IDS, ROLE_IDS], meSeat: 0 }); startTurn(D);
  ok('act: chưa tới lượt → turn', act(D, 1, 0, 'hoa_ren').reason === 'turn' && act(D, 0, 1, 'hoa_ren').reason === 'turn');
  ok('act: cấm hợp lệ', act(D, 0, 0, 'hoa_ren').ok && D.bans[0][0] === 'hoa_ren' && !isAvail(D, 'hoa_ren'));
  startTurn(D); ok('act: cấm tướng đã bị cấm → taken', act(D, 1, 0, 'hoa_ren').reason === 'taken');
  ok('act: bỏ lượt cấm = null', act(D, 1, 0, null).ok && D.bans[1][0] === null && turnDone(D));
  startTurn(D); act(D, 0, 1, null); startTurn(D); act(D, 1, 1, 'nguyet_ha'); startTurn(D);
  ok('act: chọn tướng bị cấm → taken', act(D, 0, 0, 'hoa_ren').reason === 'taken' && act(D, 0, 0, 'nguyet_ha').reason === 'taken');
  ok('act: chọn hợp lệ, bỏ cấm không ảnh hưởng lượt chọn', act(D, 0, 0, 'canh_dieu').ok && D.picks[0][0] === 'canh_dieu' && D.picks[0].filter(Boolean).length === 1 && D.bans[0].length === 2);
  // (6) autoPick
  ok('autoPick: tướng đang xem còn chọn được → lấy luôn', autoPick(D, 0, 1, 'thu_linh') === 'thu_linh');
  ok('autoPick: tướng đang xem đã dùng → hợp vị trí nhất còn lại', autoPick(D, 0, 1, 'canh_dieu') === recommend(D.roles[0][1], available(D))[0] && fit(D.roles[0][1], autoPick(D, 0, 1, 'canh_dieu')) === 2);
}

// (7) chia vị trí lúc ghép trận
{
  const rnd = mulberry32(99).next; let jg = 0, other = 0, allyOk = true, foeOk = true;
  for (let i = 0; i < 4000; i++) {
    const r = assignRoles({ pri: 'jungle', sec: 'mid' }, rnd);
    if (r.me === 'jungle') jg++; else if (r.me !== 'mid' || !r.gotSec) other++;
    if (r.allies.length !== 4 || new Set(r.allies).size !== 4 || r.allies.includes(r.me)) allyOk = false;
    if (!same([...r.foes].sort(), [...ROLE_IDS].sort())) foeOk = false;
  }
  ok('vị trí chính ~85% (82–88%), còn lại là vị trí phụ', jg / 4000 >= 0.82 && jg / 4000 <= 0.88 && other === 0, `${(jg / 40).toFixed(1)}%`);
  ok('đồng đội luôn 4 vị trí khác nhau, khác mình', allyOk);
  ok('đối thủ luôn đủ 5 vị trí', foeOk);
  const c = {}; for (let i = 0; i < 4000; i++) { const m = assignRoles({ pri: 'fill' }, rnd).me; c[m] = (c[m] || 0) + 1; }
  ok('Tuỳ ý: mỗi vị trí 800 ± 120', ROLE_IDS.every((r) => Math.abs((c[r] || 0) - 800) <= 120), JSON.stringify(c));
  let s2 = true; for (let i = 0; i < 500; i++) if (assignRoles({ pri: 'mid', sec: 'mid' }, rnd).me !== 'mid') s2 = false;
  ok('vị trí phụ trùng chính → luôn nhận vị trí chính', s2);
}

// (8) tướng tủ của người chơi
{
  const H = (heroId, win) => ({ heroId, win });
  const hist = [H('canh_dieu', 1), H('canh_dieu', 1), H('canh_dieu', 1), H('hoa_ren', 0), H('hoa_ren', 1), H('nguyet_ha', 0)];
  ok('heroMain: 6 trận, Kitewing 3/3 thắng → tướng tủ', heroMain(hist) === 'canh_dieu', String(heroMain(hist)));
  ok('heroMain: dưới 5 trận → không có', heroMain(hist.slice(0, 4)) === null);
  ok('heroMain: tỉ lệ thắng thấp → không có', heroMain([H('hoa_ren', 0), H('hoa_ren', 0), H('hoa_ren', 1), H('nguyet_ha', 0), H('thu_linh', 0)]) === null);
  const D = createDraft({ seq: DRAFT_SEQ.lite, roles: [ROLE_IDS, ROLE_IDS], meSeat: 0 }), rnd = mulberry32(5).next; let hit = 0;
  for (let i = 0; i < 2000; i++) if (botBan(D, 1, rnd, { main: 'canh_dieu' }) === 'canh_dieu') hit++;
  ok('đối thủ cấm tướng tủ ~50% (0,44–0,56)', hit / 2000 >= 0.44 && hit / 2000 <= 0.56, (hit / 2000).toFixed(3));
  let ally = 0; for (let i = 0; i < 500; i++) if (botBan(D, 0, rnd, { main: 'canh_dieu', avoid: ['canh_dieu'] }) === 'canh_dieu') ally++;
  ok('đồng đội không cấm tướng mình đang xem', ally === 0);
}

// (9) độ hợp + gợi ý
ok('fit: Bamboo Shade đi rừng = 2, Emberforge (đấu sĩ) đi rừng = 1, Kitewing đường giữa = 0', fit('jungle', 'bong_tre') === 2 && fit('jungle', 'hoa_ren') === 1 && fit('mid', 'canh_dieu') === 0);
const sup = ALPHA.filter((id) => HEROES[id].lanes.includes('support'));
ok('recommend(support) mở đầu bằng 4 tướng ghi vị trí trợ thủ', same(recommend('support').slice(0, sup.length).sort(), [...sup].sort()) && sup.length === 4, recommend('support').slice(0, 5).join(','));
ok('recommend giữ nguyên thứ tự khi không có vị trí', same(recommend(null), ALPHA) && same(recommend('fill'), ALPHA));
{
  const rnd = mulberry32(3).next, team = teamPicks(ROLE_IDS, ['bong_tre'], rnd);
  ok('teamPicks: 5 tướng khác nhau, bỏ exclude, hợp vị trí', team.length === 5 && new Set(team).size === 5 && !team.includes('bong_tre') && team.every((h, i) => fit(ROLE_IDS[i], h) >= 1), team.join(','));
  ok('choose: tránh `avoid` khi còn lựa chọn khác', choose('mid', ['nguyet_ha', 'thu_linh'], rnd, { avoid: ['nguyet_ha'] }) === 'thu_linh' && choose('mid', ['nguyet_ha'], rnd, { avoid: ['nguyet_ha'] }) === 'nguyet_ha');
}
{ // botPick không lấy tướng đi rừng cuối cùng của đồng đội cho vị trí khác khi còn lựa chọn khác
  const D = createDraft({ seq: DRAFT_SEQ.lite, roles: [['temple', 'jungle', 'mid', 'river', 'support'], ROLE_IDS], meSeat: 4 });
  D.bans[1].push('bong_tre'); let took = 0; const rnd = mulberry32(8).next;
  for (let i = 0; i < 400; i++) if (botPick(D, 0, 0, rnd) === 'kiem_thuy') took++;
  ok('botPick nhường tướng đúng vị trí cuối cùng cho đồng đội', took < 400 * 0.1, `${took}/400`);
}

console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
