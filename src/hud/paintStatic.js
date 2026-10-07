// Icon vẽ canvas (paint.js: kỹ năng / phép bổ trợ / đánh thường; itemArt.js: trang bị) đã dựng sẵn thành ảnh tĩnh
// assets/ui/paint/<khoá>.webp bằng tools/uiart/paintart.cjs. Vẽ một icon tốn ~0,1–0,3 giây CPU (điện thoại lâu hơn): vẽ lúc chạy làm
// màn chọn tướng / màn tải / đầu trận khựng từng nhịp (đầu trận vẽ sẵn ~50 icon trang bị → giật 15–20 giây). Nay chỉ tải ảnh;
// khoá chưa có ảnh (món mới chưa dựng lại) vẫn vẽ lúc chạy như cũ. Danh sách KEYS do công cụ sinh — sửa hình vẽ thì chạy lại công cụ.
const KEYS = 'bong_tre.s1 bong_tre.s2 bong_tre.s3 canh_dieu.s1 canh_dieu.s2 canh_dieu.s3 fist hoa_ren.s1 hoa_ren.s2 hoa_ren.s3 item.ao_choang_bong_dem item.ao_choang_suong item.ao_da item.ao_lua item.binh_suong_dong item.bua_than_ren item.chuong_dong item.cung_bang_lam item.cung_gio item.dao_nho item.dao_trang_khuyet item.den_dong_hanh item.den_hon_lam item.den_soi_duong item.gang_tay_da item.giap_den_long item.giap_gai item.giap_vay_rong item.giay_chien item.giay_co item.giay_kien_nhan item.giay_lu_hanh item.giay_phap_su item.giay_tinh_tam item.giay_toc_chien item.hat_nang item.huyet_kiem item.khien_da item.khien_mat_troi item.kiem_bao_tap item.kiem_sat item.luoi_huyet_nguyet item.mat_na_hoi_sinh item.mu_chien_than item.mu_sam item.nanh_thu_rung item.ngoc_bang item.ngoc_luu_ly item.ngoc_trang item.nhan_huyet_phach item.quyen_truong_tinh_tu item.riu_bao_quan item.riu_dong item.sach_co item.sach_pha_gioi item.thuong_pha_giap item.tim_co_thu item.truong_hoa_than item.truong_song item.tui_hat item.vong_bac item.vuong_mien_nguyet item.vuot_ho long_dang.s1 long_dang.s2 long_dang.s3 nguyet_ha.s1 nguyet_ha.s2 nguyet_ha.s3 spell.chop_buoc spell.giai_troi spell.gio_luot spell.hoi_phuc spell.recall spell.restore spell.thu_hoach spell.tram_hon thach_quy.s1 thach_quy.s2 thach_quy.s3';
const SET = new Set(KEYS.split(' ').filter(Boolean));
let live = false;
export const PAINT_DIR = './assets/ui/paint/';
/** URL ảnh dựng sẵn của khoá (vd 'item.kiem_sat', 'hoa_ren.s1', 'spell.recall', 'fist') hoặc null nếu phải vẽ lúc chạy. */
export const staticPaint = (key) => (!live && SET.has(key) ? `${PAINT_DIR}${key}.webp` : null);
/** Công cụ dựng ảnh bật để luôn vẽ thật (bỏ qua ảnh tĩnh). */
export function livePaint(on = true) { live = on; }
