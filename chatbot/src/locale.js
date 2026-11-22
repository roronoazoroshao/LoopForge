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

// Display-only timestamps; never alter the original API values or diagnostic exports.
export function chatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(chatLocale() === "vi" ? "vi-VN" : "zh-CN", { hour12: false });
}

 // Translate recognized platform errors only where the UI displays an error.
 // Never translate chat messages, prompts, logs, user names or unknown diagnostics.
 export function chatServerErrorText(value) {
   const text = String(value ?? "");
   if (chatLocale() !== "vi") return text;
   const missing = text.match(/^(?:(Claude Code|Codex|CodeBuddy|OpenCode|Cursor|Kimi Code|Pi|ZCode):\s*)?请先在个人配置中配置 (.+?) API Key 后再使用 \2 (?:模型|Mô hình)$/);
   if (missing) {
     const engine = missing[2];
     return `${missing[1] ? missing[1] + ": " : ""}Chưa cấu hình ${engine} API Key trong Cấu hình cá nhân. Hãy lưu API Key và Base URL của nhà cung cấp (nếu dùng gateway) trước khi chọn mô hình ${engine}.`;
   }
   const fillKey = text.match(/^请先填写 (.+?) API Key$/);
   if (fillKey) return `Hãy nhập ${fillKey[1]} API Key trong Cấu hình cá nhân.`;
   if (text === "服务没有返回可用模型，可以手动添加模型")
     return "Dịch vụ không trả về mô hình khả dụng. Bạn có thể thêm ID mô hình thủ công.";
   if (text === "模型 ID 无效") return "ID mô hình không hợp lệ.";
   if (text === "Base URL 必须为 HTTP(S) 服务地址，不能包含账号密码、查询参数或片段")
     return "Base URL phải là địa chỉ HTTP(S), không chứa thông tin đăng nhập, query hoặc fragment.";
   const listError = text.match(/^获取模型列表失败：(.*)$/s);
   if (listError) return `Không tải được danh sách mô hình: ${chatServerErrorText(listError[1])}`;
   const connection = text.match(/^无法连接 (https?:\/\/\S+?)：(.*)$/s);
   if (connection) return `Không kết nối được ${connection[1]}: ${connection[2]}`;
   const rejected = text.match(/^(.*?) 拒绝了 API Key（HTTP (401|403)）$/);
   if (rejected) return `${rejected[1]} từ chối API Key (HTTP ${rejected[2]}). Hãy kiểm tra key và Base URL.`;
   return text;
 }
