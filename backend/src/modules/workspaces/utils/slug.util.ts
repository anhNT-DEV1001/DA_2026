/**
 * Chuyển đổi chuỗi tiếng Việt hoặc bất kỳ chuỗi văn bản nào thành dạng slug URL-friendly
 * Ví dụ: "Không gian làm việc số 1" -> "khong-gian-lam-viec-so-1"
 */
export function slugify(str: string): string {
  if (!str) return '';

  return str
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Tách tổ hợp dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các ký tự dấu
    .replace(/[đĐ]/g, 'd') // Thay đ, Đ thành d
    .replace(/[^a-z0-9\s-]/g, '') // Xóa ký tự đặc biệt
    .replace(/[\s_]+/g, '-') // Thay khoảng trắng và dấu gạch dưới thành gạch ngang
    .replace(/-+/g, '-') // Gộp nhiều dấu gạch ngang liên tiếp thành 1
    .replace(/^-+|-+$/g, ''); // Cắt bỏ gạch ngang ở đầu và cuối chuỗi
}
