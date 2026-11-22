import { chatT } from "./locale.js";
const levels = {
  none: { label: chatT("关闭", "Tắt"), icon: "sparkles", detail: chatT("不使用额外推理。", "Không dùng suy luận bổ sung.") },
  thinking: { label: chatT("开启", "Bật"), icon: "brain", detail: chatT("开启思考模式。", "Bật chế độ suy luận.") },
  minimal: { label: chatT("最低", "Tối thiểu"), icon: "effort-low", detail: chatT("只做最少推理，优先尽快返回。", "Suy luận tối thiểu, ưu tiên phản hồi nhanh nhất.") },
  low: { label: chatT("低", "Thấp"), icon: "effort-low", detail: chatT("优先响应速度，适合简单问题。", "Ưu tiên tốc độ phản hồi, phù hợp câu hỏi đơn giản.") },
  medium: { label: chatT("中", "Trung bình"), icon: "effort-medium", detail: chatT("兼顾响应速度与推理深度。", "Cân bằng tốc độ phản hồi và chiều sâu suy luận.") },
  high: { label: chatT("高", "Cao"), icon: "brain", detail: chatT("更充分地推理，适合复杂问题。", "Suy luận kỹ hơn, phù hợp vấn đề phức tạp.") },
  xhigh: { label: chatT("更高", "Cao hơn"), icon: "search", detail: chatT("投入更多推理时间，适合困难任务。", "Dành thêm thời gian suy luận, phù hợp tác vụ khó.") },
  max: { label: chatT("最高", "Cao nhất"), icon: "effort-max", detail: chatT("使用模型支持的最高思考强度，耗时可能更长。", "Dùng mức suy luận cao nhất mô hình hỗ trợ, có thể mất lâu hơn.") },
  ultra: { label: chatT("极致", "Tối đa"), icon: "effort-max", detail: chatT("使用极致推理强度，耗时可能更长。", "Dùng mức suy luận tối đa, có thể mất lâu hơn.") },
  ultracode: { label: chatT("极致", "Tối đa"), icon: "effort-max", detail: chatT("使用模型的 ultracode 思考强度，耗时可能更长。", "Dùng mức suy luận ultracode của mô hình, có thể mất lâu hơn.") },
};

export function modelEffort(model, value) {
  return model?.efforts?.includes(value) ? value : "";
}

export function knownEffort(value) {
  return typeof value === "string" && Object.hasOwn(levels, value) ? value : "";
}

export function effortOptions(model) {
  return [
    { id: "", label: chatT("默认", "Mặc định"), icon: "sparkles", detail: chatT("使用当前模型的默认思考强度。", "Dùng mức suy luận mặc định của mô hình hiện tại.") },
    ...(model?.efforts || []).filter(knownEffort).map((id) => ({ id, ...levels[id] })),
  ];
}
