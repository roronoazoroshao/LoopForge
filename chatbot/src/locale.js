// The chat iframe shares the platform's same-origin language preference.
// Translate explicit UI labels only; never mutate React-managed DOM or chat content.
export function chatLocale() {
  try { return localStorage.getItem("loopforge.lang") === "vi" ? "vi" : "zh"; }
  catch { return "zh"; }
}
export const chatT = (zh, vi) => chatLocale() === "vi" ? vi : zh;

// Source labels are generated metadata, not filenames, content or protocol IDs.
const artifactSourceVI = new Map([
  ["AI 生成", "AI tạo"],
  ["上传的文件", "Tệp tải lên"],
  ["已发布", "Đã phát hành"],
  ["已保存", "Đã lưu"],
  ["已执行", "Đã thực thi"],
  ["已完成", "Đã hoàn thành"],
  ["待确认", "Chờ xác nhận"],
  ["交付物", "Sản phẩm bàn giao"],
]);
export const artifactSourceLabel = source => chatT(source, artifactSourceVI.get(source) ?? source);
