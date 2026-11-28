// The chat iframe shares the platform's same-origin language preference.
// Translate explicit UI labels only; never mutate React-managed DOM or chat content.
export function chatLocale() {
  try { const lang = localStorage.getItem("loopforge.lang"); return ["vi", "en", "zh"].includes(lang) ? lang : "zh"; }
  catch { return "zh"; }
}
// English is explicit; untranslated UI and unknown values retain their source text.
export const chatT = (zh, vi, en = zh) => {
  const lang = chatLocale();
  return lang === "vi" ? vi : lang === "en" ? en : zh;
};

// Translate only recognized auto-approval UI metadata, never message bodies or logs.
const approvalReviewStates = new Map([
  ["已批准", ["Đã phê duyệt", "Approved"]],
  ["已拒绝", ["Đã từ chối", "Denied"]],
  ["审查不可用", ["Không thể rà soát", "Review unavailable"]],
  ["正在审查操作", ["Đang rà soát thao tác", "Reviewing operation"]],
]);
const approvalReviewModels = new Map([
  ["规则快路径", ["Quy tắc xử lý nhanh", "Rule fast path"]],
  ["熔断保护", ["Bảo vệ ngắt mạch", "Circuit-breaker protection"]],
]);
export function isApprovalReviewStatus(value) {
  return typeof value === "string" && value.startsWith("帮我批准：") && approvalReviewStates.has(value.slice("帮我批准：".length));
}
export function approvalReviewStatusText(value) {
  if (!isApprovalReviewStatus(value)) return value;
  const labels = approvalReviewStates.get(value.slice("帮我批准：".length));
  return labels ? chatT(value, "Phê duyệt tự động: " + labels[0], "Auto-approval: " + labels[1]) : value;
}
export function approvalReviewDetailText(value) {
  if (typeof value !== "string") return value;
  if (value.startsWith("审查模型：")) return chatT("审查模型：", "Mô hình rà soát: ", "Review model: ") + value.slice("审查模型：".length);
  const split = value.indexOf(" · ");
  if (split < 0) return value;
  const model = value.slice(0, split);
  const labels = approvalReviewModels.get(model);
  return labels ? chatT(model, labels[0], labels[1]) + value.slice(split) : value;
}

// Source labels are generated metadata, not filenames, content or protocol IDs.
const artifactSourceLabels = new Map([
  ["AI 生成", ["AI tạo", "AI generated"]],
  ["上传的文件", ["Tệp tải lên", "Uploaded file"]],
  ["已发布", ["Đã phát hành", "Published"]],
  ["已保存", ["Đã lưu", "Saved"]],
  ["已执行", ["Đã thực thi", "Executed"]],
  ["AI 已拒绝", ["AI đã từ chối", "AI rejected"]],
  ["已完成", ["Đã hoàn thành", "Completed"]],
  ["待确认", ["Chờ xác nhận", "Awaiting confirmation"]],
  ["交付物", ["Sản phẩm bàn giao", "Deliverable"]],
]);
export const artifactSourceLabel = source => {
  const labels = artifactSourceLabels.get(source);
  return labels ? chatT(source, ...labels) : source;
};

// Display-only timestamps; never alter the original API values or diagnostic exports.
export function chatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(({ vi: "vi-VN", en: "en-US", zh: "zh-CN" })[chatLocale()], { hour12: false });
}

 // Translate recognized platform errors only where the UI displays an error.
 // Never translate chat messages, prompts, logs, user names or unknown diagnostics.
 export function chatServerErrorText(value) {
   const text = String(value ?? "");
   const lang = chatLocale();
   if (lang === "zh") return text;
   const missing = text.match(/^(?:(Claude Code|Codex|CodeBuddy|OpenCode|Cursor|Kimi Code|Pi|ZCode):\s*)?请先在个人配置中配置 (.+?) API Key 后再使用 \2 (?:模型|Mô hình)$/);
   if (missing) {
     const engine = missing[2];
     return lang === "en"
       ? `${missing[1] ? missing[1] + ": " : ""}Configure the ${engine} API key in Personal settings. Save the provider API key and Base URL (if using a gateway) before selecting the ${engine} model.`
       : `${missing[1] ? missing[1] + ": " : ""}Chưa cấu hình ${engine} API Key trong Cấu hình cá nhân. Hãy lưu API Key và Base URL của nhà cung cấp (nếu dùng gateway) trước khi chọn mô hình ${engine}.`;
   }
   const fillKey = text.match(/^请先填写 (.+?) API Key$/);
   if (fillKey) return lang === "en" ? `Enter the ${fillKey[1]} API key in Personal settings.` : `Hãy nhập ${fillKey[1]} API Key trong Cấu hình cá nhân.`;
   if (text === "服务没有返回可用模型，可以手动添加模型")
     return lang === "en" ? "The service returned no available models. You can add a model ID manually." : "Dịch vụ không trả về mô hình khả dụng. Bạn có thể thêm ID mô hình thủ công.";
   if (text === "模型 ID 无效") return lang === "en" ? "Invalid model ID." : "ID mô hình không hợp lệ.";
   if (text === "Base URL 必须为 HTTP(S) 服务地址，不能包含账号密码、查询参数或片段")
     return lang === "en" ? "The Base URL must be an HTTP(S) service address without credentials, a query, or a fragment." : "Base URL phải là địa chỉ HTTP(S), không chứa thông tin đăng nhập, query hoặc fragment.";
   const listError = text.match(/^获取模型列表失败：(.*)$/s);
   if (listError) return lang === "en" ? `Failed to load models: ${chatServerErrorText(listError[1])}` : `Không tải được danh sách mô hình: ${chatServerErrorText(listError[1])}`;
   const connection = text.match(/^无法连接 (https?:\/\/\S+?)：(.*)$/s);
   if (connection) return lang === "en" ? `Could not connect to ${connection[1]}: ${connection[2]}` : `Không kết nối được ${connection[1]}: ${connection[2]}`;
   const rejected = text.match(/^(.*?) 拒绝了 API Key（HTTP (401|403)）$/);
   if (rejected) return lang === "en" ? `${rejected[1]} rejected the API key (HTTP ${rejected[2]}). Check the key and Base URL.` : `${rejected[1]} từ chối API Key (HTTP ${rejected[2]}). Hãy kiểm tra key và Base URL.`;
   return text;
 }
