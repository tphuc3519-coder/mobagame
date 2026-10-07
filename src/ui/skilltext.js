// Mô tả kỹ năng tự sinh từ số liệu khi dữ liệu tướng chưa có câu mô tả (desc): kiểu thi triển + tầm, sát thương theo cấp và hệ số,
// hiệu ứng khống chế / cường hoá, hồi máu / khiên, hồi chiêu, năng lượng. Dùng ở màn chọn tướng và trang chi tiết tướng.
const DMG = { physical: 'vật lý', magic: 'phép', true: 'chuẩn' };
const first = (v) => (Array.isArray(v) ? v[0] : v);
const span = (v, unit = '') => (Array.isArray(v) && v.length > 1 && v[0] !== v[v.length - 1] ? `${v[0]}–${v[v.length - 1]}${unit}` : `${first(v)}${unit}`);
const pct = (v) => `${Math.round(first(v) * 100)}%`;
const sec = (v) => span(v, 's');

/** "70 (+35 mỗi cấp) + 110% Công" */
function amount(a) {
  const out = [`${a.base}${a.perLevel ? ` (+${a.perLevel} mỗi cấp)` : ''}`];
  if (a.ad) out.push(`${pct(a.ad)} Công`); if (a.adBonus) out.push(`${pct(a.adBonus)} Công cộng thêm`);
  if (a.ap) out.push(`${pct(a.ap)} Phép`); if (a.hpPct) out.push(`${pct(a.hpPct)} Máu tối đa`);
  return out.join(' + ');
}
const STAT = { atk: 'Công', ap: 'Phép', armor: 'giáp', mr: 'kháng phép', atkSpeedPct: 'tốc đánh', moveSpeedPct: 'tốc chạy', crit: 'chí mạng', lifesteal: 'hút máu', dmgReduce: 'giảm sát thương nhận' };
const PCT = new Set(['atkSpeedPct', 'moveSpeedPct', 'crit', 'lifesteal', 'dmgReduce']);
function effect(e) {
  switch (e.status) {
    case 'slow': return `làm chậm ${pct(e.pct)} trong ${sec(e.duration)}`;
    case 'haste': return `tăng ${pct(e.pct)} tốc chạy trong ${sec(e.duration)}`;
    case 'stun': return `làm choáng ${sec(e.duration)}`;
    case 'knockup': return `hất tung ${sec(e.duration)}`;
    case 'taunt': return `khiêu khích ${sec(e.duration)}`;
    case 'root': return `trói chân ${sec(e.duration)}`;
    case 'silence': return `câm lặng ${sec(e.duration)}`;
    case 'stealth': return `tàng hình ${sec(e.duration)}`;
    case 'statMod': {
      const s = Object.entries(e).filter(([k]) => STAT[k]).map(([k, v]) => `+${PCT.has(k) ? pct(v) : span(v)} ${STAT[k]}`);
      return s.length ? `${s.join(', ')} trong ${sec(e.duration)}` : '';
    }
    default: return '';
  }
}
const list = (effs) => (effs || []).map(effect).filter(Boolean).join(', ');

const KIND = {
  skillshot: (s) => `Phóng theo hướng ngắm (tầm ${s.range})${s.pierce ? ', xuyên qua mọi mục tiêu' : ''}`,
  cone: (s) => `Đánh hình quạt ${s.angle || 90}° phía trước (tầm ${s.range})`,
  aoeCircle: (s) => `Giáng xuống vùng tròn bán kính ${s.radius} tại điểm chọn (tầm ${s.range})${s.delay ? ` sau ${s.delay}s` : ''}${s.untargetableDuringDelay ? ', không thể bị chọn làm mục tiêu lúc lao lên' : ''}`,
  aoeSelf: (s) => (s.damage || s.effects ? `Đánh lan quanh mình (bán kính ${s.radius})` : `Toả ra quanh mình (bán kính ${s.radius})`),
  dash: (s) => `Lướt ${s.range} theo hướng ngắm${s.hitAlongPath ? ', trúng mọi địch trên đường' : ''}`,
  zone: (s) => `Tạo vùng bán kính ${s.radius} tại điểm chọn (tầm ${s.range}) trong ${s.duration}s`,
  selfBuff: () => '',
  allyTarget: (s) => `Chọn đồng minh theo hướng ngắm trong tầm ${s.range} (không có thì chính mình)`,
};

/** Mô tả đầy đủ (câu + dòng hồi chiêu / năng lượng) của một kỹ năng. */
export function skillDesc(s) {
  if (!s) return '';
  const meta = [s.cooldown ? `Hồi chiêu ${sec(s.cooldown)}` : '', s.cost && first(s.cost) ? `Tốn ${span(s.cost)} năng lượng` : ''].filter(Boolean).join(' · ');
  if (s.desc) return meta ? `${s.desc} (${meta})` : s.desc;
  const out = [KIND[s.type]?.(s) || ''];
  if (s.hook) out.push(`kéo địch trúng đầu tiên về sát trước mặt${s.hook.stun ? ` và làm choáng ${s.hook.stun}s` : ''}`);
  if (s.pullIn != null) out.push('hút địch trong vùng về quanh mình');
  if (s.damage) out.push(`gây ${amount(s.damage)} sát thương ${DMG[s.damage.type] || ''}${s.tickInterval ? ` mỗi ${s.tickInterval}s` : ''}`.trim());
  const fx = list(s.effects); if (fx) out.push(fx);
  if (s.heal) out.push(`hồi ${amount(s.heal)} máu`);
  if (s.shield) out.push(`tạo khiên ${amount(s.shield)}${s.shield.duration ? ` trong ${s.shield.duration}s` : ''}`);
  if (s.allyShield) out.push(`bản thân và đồng minh quanh mình nhận khiên ${amount(s.allyShield)}${s.allyShield.duration ? ` trong ${s.allyShield.duration}s` : ''}`);
  const af = list(s.allyEffects); if (af) out.push(`đồng minh quanh mình ${af}`);
  const sf = list(s.selfEffects); if (sf) out.push(`bản thân ${sf}`);
  if (s.ambush) out.push(`đòn đánh đầu tiên khi tàng hình gây thêm ${amount(s.ambush)} sát thương${s.ambush.slow ? ` và làm chậm ${pct(s.ambush.slow)}` : ''}`);
  if (s.nextAttackRange) out.push(`đòn đánh kế tiếp xa thêm ${s.nextAttackRange}`);
  if (s.onHitHero === 'cutS2') out.push('trúng tướng thì thời gian hồi K2 còn lại giảm một nửa');
  const text = out.filter(Boolean).join(', ');
  return (text ? text[0].toUpperCase() + text.slice(1) + '.' : '') + (meta ? ` (${meta})` : '');
}
