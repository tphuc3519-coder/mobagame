// Bộ biểu tượng giao diện dùng chung: nét vàng ánh kim có chuyển sắc + viền tối mảnh, cùng một phong cách (thay ký tự emoji).
// Mỗi lần gọi tạo id gradient riêng để nhiều biểu tượng trên cùng trang không giẫm nhau.
let n = 0;
const gold = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset=".55" stop-color="#f0c868"/><stop offset="1" stop-color="#b8862e"/></linearGradient>`;
const wrap = (body, vb = 24) => { const id = 'uig' + n++; return `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true"><defs>${gold(id)}</defs>${body.replaceAll('$G', `url(#${id})`)}</svg>`; };

export const ICON = {
  gear: () => wrap('<path fill="$G" stroke="#2a1c08" stroke-width=".6" d="M13.2 2.5l.5 2.4a7.6 7.6 0 012 .9l2.1-1.3 1.7 1.7-1.3 2.1c.4.6.7 1.3.9 2l2.4.5v2.4l-2.4.5a7.6 7.6 0 01-.9 2l1.3 2.1-1.7 1.7-2.1-1.3c-.6.4-1.3.7-2 .9l-.5 2.4h-2.4l-.5-2.4a7.6 7.6 0 01-2-.9l-2.1 1.3-1.7-1.7 1.3-2.1a7.6 7.6 0 01-.9-2l-2.4-.5v-2.4l2.4-.5c.2-.7.5-1.4.9-2L4 6.2 5.7 4.5l2.1 1.3c.6-.4 1.3-.7 2-.9l.5-2.4z"/><circle cx="12" cy="12" r="3.4" fill="#161a30" stroke="#2a1c08" stroke-width=".6"/><circle cx="12" cy="12" r="1.5" fill="$G"/>'),
  expand: () => wrap('<path fill="none" stroke="$G" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
  clock: () => wrap('<circle cx="12" cy="12" r="8.6" fill="none" stroke="$G" stroke-width="2.2"/><path d="M12 7v5.2l3.4 2" fill="none" stroke="$G" stroke-width="2.2" stroke-linecap="round"/>'),
  kill: () => wrap('<path fill="$G" stroke="#2a1c08" stroke-width=".5" d="M3 3.5l1.5-.5 9 9-1.6 1.6-9-9zM21 3.5L19.5 3l-9 9 1.6 1.6 9-9z"/><path fill="$G" d="M5.4 15.8l2.8 2.8-1.2 1.2-1-1-1.6 1.6-1.3-1.3 1.6-1.6-1-1zM18.6 15.8l-2.8 2.8 1.2 1.2 1-1 1.6 1.6 1.3-1.3-1.6-1.6 1-1z"/>'),
  death: () => wrap('<path fill="$G" stroke="#2a1c08" stroke-width=".5" d="M12 2.6c-4.8 0-7.9 3.3-7.9 7.4 0 2.6 1.2 4.3 2.8 5.3v3.3h2.2v-1.8h1.6v1.8h2.6v-1.8h1.6v1.8h2.2v-3.3c1.6-1 2.8-2.7 2.8-5.3 0-4.1-3.1-7.4-7.9-7.4z"/><ellipse cx="8.9" cy="10.6" rx="2" ry="2.2" fill="#161a30"/><ellipse cx="15.1" cy="10.6" rx="2" ry="2.2" fill="#161a30"/><path d="M12 13l-1 2h2z" fill="#161a30"/>'),
  assist: () => wrap('<path fill="$G" stroke="#2a1c08" stroke-width=".5" d="M7.5 11V5.8a1.5 1.5 0 013 0V10V4.4a1.5 1.5 0 013 0V10V5.6a1.5 1.5 0 013 0V13c0 4.4-2.5 7.6-6 7.6-3 0-5-1.8-6-4.6L3.4 12a1.4 1.4 0 012.4-1.2z"/>'),
  menu: () => wrap('<path d="M4 6h16M4 12h16M4 18h16" stroke="$G" stroke-width="2.4" stroke-linecap="round"/>'),
  // nút Ăn lính: mũ trụ lính có chỏm lông + kiếm chéo phía sau
  minion: () => wrap('<path d="M7 27L27 7" stroke="#cfd6de" stroke-width="2.6" stroke-linecap="round"/><path d="M25 7l3-1-1 3z" fill="#eef2f6"/><path fill="$G" stroke="#2a1c08" stroke-width=".7" d="M8 22c0-6.6 3.6-11 9-11s9 4.4 9 11v2.5H8z"/><path fill="#c8402f" d="M17 4.5c3 1.5 4.5 4 4.3 7-1.4-1.4-2.8-2.1-4.3-2.1s-2.9.7-4.3 2.1c-.2-3 1.3-5.5 4.3-7z"/><path fill="#161a30" d="M10.5 18.5h13v3h-13z"/><path fill="$G" d="M15.6 18.5h2.8v6h-2.8z"/><path fill="$G" stroke="#2a1c08" stroke-width=".6" d="M7 24.5h20l-1.2 3H8.2z"/>', 34),
  // nút Đẩy trụ: tháp đèn mái đình có pha lê sáng
  tower: () => wrap('<path fill="$G" stroke="#2a1c08" stroke-width=".7" d="M9.5 30h15l-1.8-13.5h-11.4zM6.5 12.5c3.5-.6 7-2.6 10.5-7.5 3.5 4.9 7 6.9 10.5 7.5l-1.3 2H7.8z"/><path fill="#161a30" d="M14.6 21.5a2.4 2.4 0 014.8 0V30h-4.8z"/><path fill="#7ae8ff" stroke="#e8fbff" stroke-width=".6" d="M17 14.6l1.7 2-1.7 2.4-1.7-2.4z"/><path fill="$G" d="M16.4 2.5h1.2v3h-1.2z"/>', 34),
};
