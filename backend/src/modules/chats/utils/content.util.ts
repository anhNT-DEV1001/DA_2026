const PREVIEW_LENGTH = 200;

/** Bỏ thẻ HTML / ký hiệu markdown phổ biến để lấy chữ thuần */
export function plainText(content: string) {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[*_~`>#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nội dung rỗng sau khi bỏ định dạng (vd: "<p></p>"); tin chỉ có ảnh vẫn hợp lệ */
export function isBlankContent(content: string) {
  if (/<img\s/i.test(content)) return false;
  return !plainText(content);
}

/** Đoạn ngắn hiển thị ở sidebar / thông báo */
export function preview(content: string) {
  const text = plainText(content);
  return text.length > PREVIEW_LENGTH
    ? `${text.slice(0, PREVIEW_LENGTH - 1)}…`
    : text;
}

export function uniqueIds(ids: number[] = []) {
  return [...new Set(ids)];
}
