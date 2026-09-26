export { cn } from "cn";

/**
 * Định dạng đối tượng Date thành chuỗi "YYYY-MM-DD" theo giờ địa phương,
 * tránh việc toISOString() chuyển đổi sang giờ UTC làm lệch ngày (ví dụ UTC+7 chuyển về UTC bị lùi 1 ngày).
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Phân tích chuỗi ngày từ server (dạng "YYYY-MM-DD" hoặc ISO) thành đối tượng Date theo giờ địa phương,
 * tránh việc new Date("YYYY-MM-DD") bị hiểu là UTC midnight và lệch ngày ở các múi giờ khác nhau.
 */
export const parseLocalDate = (
  dateInput?: string | Date | null,
): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === "string") {
    const datePart = dateInput.split("T")[0];
    const parts = datePart.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
};
