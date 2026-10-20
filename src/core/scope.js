// Phạm vi dọn dẹp của một trận (GĐ3 — đấu lại ngay trong trang, không tải lại): mọi thứ trận gắn vào window / document / body (sự kiện,
// phần tử DOM, hẹn giờ, đăng ký cài đặt) đi qua đây để lúc rời trận gỡ sạch một lượt. startMatch dựng trận trong enterScope(scope) nên các
// module HUD chỉ cần gọi on() / track() (không phải nhận thêm tham số). Ngoài trận (không có phạm vi) thì on() / track() như bình thường.
// LUẬT: listener toàn cục mới trong trận phải dùng on(), phần tử gắn vào body phải bọc track() (docs/DECISIONS.md, GĐ3).
let cur = null;

export function createScope(name = '') {
  const ac = new AbortController(), timers = new Set(), intervals = new Set(), fns = [];
  let dead = false;
  const s = {
    name, signal: ac.signal,
    get disposed() { return dead; },
    on(target, type, fn, opts) { target.addEventListener(type, fn, { ...(typeof opts === 'boolean' ? { capture: opts } : opts || {}), signal: ac.signal }); },
    later(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; },
    every(fn, ms) { const id = setInterval(() => { if (!dead) fn(); }, ms); intervals.add(id); return id; },
    node(el) { fns.push(() => el.remove()); return el; },
    add(fn) { fns.push(fn); },
    dispose() {
      if (dead) return; dead = true; ac.abort();
      for (const id of timers) clearTimeout(id); for (const id of intervals) clearInterval(id); timers.clear(); intervals.clear();
      for (let i = fns.length - 1; i >= 0; i--) { try { fns[i](); } catch (e) { console.warn('dọn trận', e); } }
      fns.length = 0;
    },
  };
  return s;
}
export const currentScope = () => cur;
/** Đặt phạm vi hiện tại (trả hàm khôi phục phạm vi trước). */
export function enterScope(s) { const prev = cur; cur = s; return () => { cur = prev; }; }
/** addEventListener gắn vào phạm vi hiện tại (nếu có). */
export function on(target, type, fn, opts) { if (cur && !cur.disposed) cur.on(target, type, fn, opts); else target.addEventListener(type, fn, opts); }
/** Phần tử sẽ bị gỡ khỏi DOM khi phạm vi hiện tại kết thúc. */
export const track = (el) => (cur ? cur.node(el) : el);
