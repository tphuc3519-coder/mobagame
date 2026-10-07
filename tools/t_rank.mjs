// Kiểm thử luật bậc hạng (08 §1) và điểm trận (08 §2): node tools/t_rank.mjs
import { profile, rankOf, applyResult, TIERS, COURAGE_MAX, itemCount } from '../src/ui/profile.js';
import { scoreMatch, titleOf, medalOf } from '../src/ui/score.js';

let fail = 0;
const ok = (cond, name, extra = '') => { console.log(`${cond ? 'ĐẠT' : 'TRƯỢT'} ${name}${extra ? '  ' + extra : ''}`); if (!cond) fail++; };

// —— bậc hạng ——
ok(rankOf(0).name === 'Đèn Dầu III' && rankOf(0).star === 0, 'mốc 0 = Đèn Dầu III', rankOf(0).name);
ok(rankOf(8).name === 'Đèn Dầu I' && rankOf(8).star === 2, 'sao 8 = Đèn Dầu I, 2 sao', rankOf(8).name);
ok(rankOf(9).name === 'Đèn Lồng IV' && rankOf(9).start === 9, 'sao 9 = Đèn Lồng IV (sàn 9)', rankOf(9).name);
const span = TIERS.slice(0, 6).reduce((a, t) => a + t.divs * t.stars, 0);
ok(rankOf(span).name === 'Nguyệt Quang' && rankOf(span).max === 0, `sao ${span} = Nguyệt Quang`, rankOf(span).name);
ok(rankOf(span + 30).name === 'Thái Dương', 'từ 30 sao Nguyệt Quang = Thái Dương', rankOf(span + 30).name);
for (let s = 0; s < span + 40; s++) { const r = rankOf(s); if (!r || (r.max && (r.star < 0 || r.star >= r.max))) { ok(false, 'rankOf liền mạch', String(s)); break; } }

// —— luật sao ——
const p = profile(); const reset = (stars, extra = {}) => Object.assign(p, { stars, best: stars, courage: 0, streak: 0, bag: { giu_sao_mvp: 0 } }, extra);
const lose = (o = {}) => applyResult({ mode: 'ranked', win: false, score: 6, ...o }), win = (o = {}) => applyResult({ mode: 'ranked', win: true, score: 8, ...o });
reset(5); let r = lose(); ok(r.stars === 0 && p.stars === 5, 'Đèn Dầu thua không mất sao', r.notes.join('; '));
reset(20); r = lose(); ok(r.stars === 0 && p.stars === 20, 'Đèn Lồng thua không mất sao');
reset(25); r = lose(); ok(r.stars === 0 && p.stars === 25, 'Đèn Kéo Quân IV 0 sao: sàn bậc, không rớt về Đèn Lồng', r.notes.join('; '));
reset(27); r = lose(); ok(r.stars === -1 && p.stars === 26, 'Đèn Kéo Quân có sao: thua −1');
const hd = rankOf(66); reset(66); r = lose(); ok(hd.short === 'Hải Đăng' && r.stars === -1 && p.stars === 65, 'Hải Đăng rớt bậc được', `${hd.name} → ${rankOf(p.stars).name}`);
reset(30); r = win(); ok(r.stars === 1 && p.stars === 31, 'thắng +1 sao');
reset(30, { streak: 2 }); r = win(); ok(r.stars === 2, 'chuỗi 3 trận thắng: +1 sao thưởng', r.notes.join('; '));
reset(30, { courage: COURAGE_MAX - 5 }); r = win(); ok(r.stars === 2 && p.courage === 0 && r.courage.used, 'tích luỹ đầy khi thắng: +1 sao', r.notes.join('; '));
reset(30, { courage: COURAGE_MAX - 1 }); r = lose(); ok(r.stars === 0 && p.courage === 0, 'tích luỹ đầy khi thua: giữ sao', r.notes.join('; '));
reset(30, { bag: { giu_sao_mvp: 1 } }); r = lose({ mvp: 'silver' }); ok(r.stars === 0 && itemCount('giu_sao_mvp') === 0, 'MVP thua + Bùa Giữ Sao: giữ sao, mất 1 bùa', r.notes.join('; '));
reset(30); r = lose({ mvp: 'silver' }); ok(r.stars === -1, 'MVP thua không có bùa: vẫn −1 sao');
reset(5, { courage: 0 }); r = lose({ score: 10 }); ok(p.courage === 5, 'điểm tích luỹ khi thua = điểm trận / 2', String(p.courage));
reset(5, { courage: 0 }); r = win({ score: 10 }); ok(p.courage === 20, 'điểm tích luỹ khi thắng = 10 + điểm trận', String(p.courage));
reset(span + 2, { streak: 5 }); r = win(); ok(r.stars === 1, 'Nguyệt Quang: không có sao chuỗi thắng');
const g0 = p.gold; r = applyResult({ mode: 'training', win: true, score: 10 }); ok(r.gold === 0 && p.gold === g0, 'luyện tập không tính thưởng');
r = applyResult({ mode: 'solo', win: true, score: 10, mvp: 'gold' }); ok(r.gold === Math.round((100 + 60 + 30) * 0.7), 'đấu đơn nhận 70% vàng', String(r.gold));

// —— điểm trận ——
const H = (id, team, k, d, a, gold, dmg, taken, tower, heal = 0) => ({ id, team, heroId: 'hoa_ren', kills: k, deaths: d, assists: a, goldEarned: gold, dmgHero: dmg, dmgTaken: taken, dmgTower: tower, healAlly: heal, level: 12, items: [] });
const rows = scoreMatch([H(1, 0, 10, 1, 6, 9000, 22000, 9000, 4000), H(2, 0, 1, 4, 12, 6000, 6000, 26000, 300, 9000), H(3, 0, 3, 3, 5, 7000, 12000, 12000, 2000), H(4, 0, 2, 5, 3, 5000, 7000, 8000, 100), H(5, 0, 4, 2, 6, 7500, 15000, 10000, 1500),
  H(6, 1, 4, 6, 3, 6500, 14000, 15000, 900), H(7, 1, 3, 4, 4, 5500, 9000, 21000, 300, 3000), H(8, 1, 5, 5, 2, 7000, 17000, 9000, 2000), H(9, 1, 1, 3, 5, 4800, 4000, 7000, 100), H(10, 1, 2, 5, 3, 5200, 8000, 11000, 700)], 0);
ok(rows.every((x) => x.score >= 2 && x.score <= 16), 'điểm trong khoảng 2–16', rows.map((x) => x.score).join(' '));
ok(rows[0].mvp === 'gold' && rows[0].score === Math.max(...rows.map((x) => x.score)), 'MVP vàng = điểm cao nhất đội thắng', String(rows[0].score));
ok(rows.filter((x) => x.mvp === 'silver').length === 1 && rows.find((x) => x.mvp === 'silver').team === 1, 'một MVP bạc ở đội thua');
ok(titleOf(rows[1], rows).name === 'Tường Thành', 'danh hiệu Tường Thành cho người gánh nhiều nhất', titleOf(rows[1], rows).name);
ok(medalOf(rows[0], rows, 'k') === 'gold' && medalOf(rows[8], rows, 'k') === 'none', 'huy chương theo thứ hạng');
const flat = scoreMatch([H(1, 0, 0, 0, 0, 1000, 0, 0, 0), H(2, 1, 0, 0, 0, 1000, 0, 0, 0)], 1);
ok(flat[0].score === 3.5 && flat[1].score === 4.5, 'trận không giao tranh: 2 + kinh tế 1,5 (+1 thắng)', flat.map((x) => x.score).join(' '));

console.log(fail ? `\n${fail} kiểm tra TRƯỢT` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
