import { chatT } from "./locale.js";
const states = {
  running: { state: "running", label: chatT("正在回复", "Đang phản hồi"), icon: "arc-spinner", busy: true },
  // 回复结束不再画勾：侧栏只提示进行中、异常和待接话的状态，
  // 避免每行都挂一个表示“已回复”的对勾。
  completed: { state: "completed", label: chatT("回复完成", "Phản hồi hoàn tất") },
  failed: { state: "failed", label: chatT("回复失败", "Phản hồi thất bại"), icon: "alert" },
  // 手动停止和回复完成一样是结束状态：侧栏不再挂停止方块，
  // 否则被停过的会话会一直留着一个像“还能再点一次”的停止图标。
  cancelled: { state: "cancelled", label: chatT("已停止回复", "Đã dừng phản hồi") },
  interrupted: { state: "interrupted", label: chatT("回复已中断", "Phản hồi bị gián đoạn"), icon: "warning" },
  idle: { state: "idle", label: chatT("当前没有生成中的回复", "Hiện không có phản hồi đang tạo"), icon: "chat" },
};

// A generation describes a model reply, never the completion of a project/task.
// Only the selected session supplies live generation/submission information.
export function sessionReplyStatus(session, { generation, busy = false } = {}) {
  const matching = generation && (!generation.sessionId || generation.sessionId === session.id);
  const value = busy ? "running" : (matching && generation.status) || session.generationStatus;
  return states[value === "canceled" ? "cancelled" : value] || states.idle;
}

// A completed reply the reader has not opened yet carries a blue dot, as in
// Codex; once read, a completed row is quiet again.
const unreadState = { state: "unread", label: chatT("有新回复未读", "Có phản hồi mới chưa đọc"), dot: true };

export function sidebarReplyStatus(status, unread = false) {
  return unread && status.state === "completed" ? unreadState : status;
}

// Run sessions only earn a chip while something needs the reader: a running
// SOP, a run waiting for a person, or a failure. Finished runs stay quiet; the
// title already says which SOP they belong to.
const runStates = {
  running: { state: "running", label: chatT("运行中", "Đang chạy") },
  waiting: { state: "waiting", label: chatT("待处理", "Chờ xử lý") },
  failed: { state: "failed", label: chatT("失败", "Thất bại") },
};

export function runSessionState(session) {
  if (!session?.shared || !session?.runId) return null;
  const state = runStates[session.runStatus];
  if (!state) return null;
  return { ...state, label: session.runStatusLabel || state.label };
}

// The hover text of a history row. A run conversation's title says what the
// run does, so its SOP and run state are named here instead of in the row.
export function sessionTooltip(session, { projectName = "", replyLabel = "" } = {}) {
  const run = Boolean(session?.shared && session?.runId);
  const title = session?.displayTitle || session?.title || chatT("新对话", "Cuộc trò chuyện mới");
  const sop = run && session.sopName && !title.includes(session.sopName) ? session.sopName : "";
  return [title, projectName, sop, run ? session.runStatusLabel || replyLabel : replyLabel]
    .filter(Boolean)
    .join(" · ");
}
