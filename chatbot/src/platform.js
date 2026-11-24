import { chatT, chatLocale } from "./locale.js";
export const actionNames = {
  runs_start: chatT("启动 SOP", "Khởi chạy SOP"),
  runs_approve: chatT("批准节点", "Phê duyệt nút"),
  runs_reject: chatT("退回节点", "Trả lại nút"),
  runs_retry: chatT("重试节点", "Thử lại nút"),
  runs_cancel: chatT("取消运行", "Hủy lượt chạy"),
  runs_pause: chatT("暂停运行", "Tạm dừng lượt chạy"),
  runs_resume: chatT("继续运行", "Tiếp tục lượt chạy"),
  issues_dispatch: chatT("派发 SOP", "Điều phối SOP"),
  issues_save: chatT("保存需求", "Lưu yêu cầu"),
  issues_import_tapd: chatT("导入 TAPD 需求", "Nhập yêu cầu TAPD"),
  issues_chat_clarify: chatT("发起 AI 需求澄清", "Khởi tạo làm rõ yêu cầu bằng AI"),
  issues_clarification_save: chatT("保存并回写需求澄清", "Lưu và ghi lại kết quả làm rõ"),
  issues_delete: chatT("删除需求", "Xóa yêu cầu"),
  issues_comments_add: chatT("添加需求评论", "Thêm bình luận yêu cầu"),
  issues_reopen: chatT("重新打开需求", "Mở lại yêu cầu"),
  workflows_save: chatT("保存 SOP", "Lưu SOP"),
  workflows_clone: chatT("复制 SOP", "Sao chép SOP"),
  workflows_publish: chatT("发布 SOP", "Phát hành SOP"),
  agents_save: chatT("保存角色", "Lưu vai trò"),
  assistant_tasks_save: chatT("保存定时任务", "Lưu tác vụ theo lịch"),
};
const entities = {
  agents: chatT("角色", "vai trò"),
  workflows: "SOP",
  projects: chatT("项目", "dự án"),
  repositories: chatT("仓库", "kho mã"),
  rules: chatT("规则", "quy tắc"),
  skills: chatT("技能", "kỹ năng"),
  mcp_servers: chatT("MCP 服务", "dịch vụ MCP"),
  schedule_jobs: chatT("平台定时任务", "tác vụ nền tảng theo lịch"),
  assistant_tasks: chatT("助手定时任务", "tác vụ trợ lý theo lịch"),
  runs: chatT("运行", "lượt chạy"),
  issues: chatT("需求", "yêu cầu"),
  environments: chatT("环境", "môi trường"),
  sandboxes: chatT("沙箱", "sandbox"),
  dockerfiles: "Dockerfile",
  executors: chatT("执行器", "trình thực thi"),
};
const verbs = {
  save: chatT("保存", "Lưu"),
  delete: chatT("删除", "Xóa"),
  publish: chatT("发布", "Phát hành"),
  clone: chatT("复制", "Sao chép"),
  start: chatT("启动", "Khởi chạy"),
  cancel: chatT("取消", "Hủy"),
  retry: chatT("重试", "Thử lại"),
  pause: chatT("暂停", "Tạm dừng"),
  resume: chatT("继续", "Tiếp tục"),
  run: chatT("执行", "Thực thi"),
  import: chatT("导入", "Nhập"),
  restore: chatT("恢复", "Khôi phục"),
};
export const actionName = (tool) => {
  if (actionNames[tool]) return actionNames[tool];
  const match = tool?.match(/^(.*)_([^_]+)$/);
  return match && entities[match[1]] && verbs[match[2]]
    ? verbs[match[2]] + chatT('', ' ') + entities[match[1]]
    : tool
      ? chatT(`执行 ${tool}`, `Thực thi ${tool}`)
      : chatT("未指定操作", "Chưa chỉ định thao tác");
};
export const visibleSidebarArtifact = (a) =>
  !a.draft ||
  !!definitionTarget(a) ||
  (!a.draft.saved &&
    !a.draft.resolved &&
    !a.draft.inherited &&
    a.draft.decision !== "rejected");

export function definitionTarget(artifact, projectId = "") {
  if (!["sop", "role"].includes(artifact?.kind)) return null;
  if (artifact.draft && !artifact.draft.saved) return null;
  const saved =
    artifact.draft?.savedResult?.data || artifact.draft?.savedResult;
  const asset = artifact.asset || saved;
  if (!asset?.id) return null;
  const project =
    asset.projectId || artifact.draft?.body?.projectId || projectId;
  return {
    id: asset.id,
    href: `/${project ? `?projectId=${encodeURIComponent(project)}` : ""}#/${artifact.kind === "sop" ? "flow" : "agents"}/${encodeURIComponent(asset.id)}`,
    label: artifact.kind === "sop" ? chatT("打开 SOP 编排", "Mở điều phối SOP") : chatT("打开角色定义", "Mở định nghĩa vai trò"),
  };
}

// After a new project is created from a chat the user wants to keep working in
// it, but the chat stays bound to its own project and the assistant cannot
// switch it. Link to the Studio with the new project selected.
export function projectEntryTarget(draft, currentProjectId = "") {
  if (draft?.tool !== "projects_save" || !draft.saved) return null;
  const saved = draft.savedResult?.data || draft.savedResult || {};
  const id = saved.id || draft.body?.id;
  if (!id || id === currentProjectId) return null;
  return {
    href: `/?projectId=${encodeURIComponent(id)}#/collaboration`,
    label: chatT(`进入项目「${saved.name || draft.body?.name || id}」继续对话`, `Vào dự án «${saved.name || draft.body?.name || id}» để tiếp tục hội thoại`),
  };
}

// A historical approval draft may already have been approved in a later turn.
// Derive its current display state without rewriting its execution receipt.
export function reconcileOperation(artifact, runs) {
  const draft = artifact.draft;
  if (!draft || draft.saved || draft.inherited || draft.tool !== "runs_approve")
    return artifact;
  const run = runs.find((r) => r.id === draft.path?.id);
  const node = run?.nodes?.[draft.body?.nodeId];
  if (!["succeeded", "skipped"].includes(node?.status)) return artifact;
  return { ...artifact, source: "已完成", draft: { ...draft, resolved: true } };
}
