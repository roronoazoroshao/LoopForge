import { chatT } from "./locale";
import React, { useEffect, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import SlidingTabs from "./SlidingTabs";
import HarnessSelect from "./HarnessSelect";
import { api, write, collectArtifacts } from "./api";
import { ArtifactPreview, download } from "./RichContent";
import { IconButton } from "./ui";
import {
  actionName,
  definitionTarget,
  projectEntryTarget,
} from "./platform.js";
import {
  operationSummary,
  operationValidation,
  repositoryIds,
  operationError,
} from "./operations.js";

const File = (props) => <HarnessIcon name="artifact" {...props} />;
const FileImage = (props) => <HarnessIcon name="image" {...props} />;
const GitBranch = (props) => <HarnessIcon name="workflow" {...props} />;
const ChevronRight = (props) => <HarnessIcon name="chevron-right" {...props} />;
const RefreshCw = (props) => <HarnessIcon name="refresh" {...props} />;
const X = (props) => <HarnessIcon name="close" {...props} />;
const Download = (props) => <HarnessIcon name="download" {...props} />;
const Folder = (props) => <HarnessIcon name="folder" {...props} />;
const Check = (props) => <HarnessIcon name="check" {...props} />;
const Play = (props) => <HarnessIcon name="play" {...props} />;
const UserRound = (props) => <HarnessIcon name="user" {...props} />;
const ExternalLink = (props) => (
  <HarnessIcon name="preview-expand" {...props} />
);

function useCountdown(expiresAt) {
  const deadline = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (Number.isNaN(deadline)) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (Number.isNaN(deadline)) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function formatCountdown(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function DraftCard({
  artifact,
  onApply,
  onDecide,
  onPreview,
  context = {},
}) {
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const draft = artifact.draft;
  const declined = ["declined", "muted", "expired", "rejected"].includes(draft.decision);
  const answerable =
    !!draft.proposal &&
    !draft.inherited &&
    !draft.saved &&
    !draft.decision &&
    !!onDecide;
  const remaining = useCountdown(
    answerable && draft.proposal.timing === "start"
      ? draft.proposal.expiresAt
      : "",
  );
  const decide = async (decision) => {
    setBusy(true);
    setError("");
    try {
      await onDecide(artifact.messageIndex, artifact.draftIndex, decision);
    } catch (e) {
      setError(operationError(e));
    } finally {
      setBusy(false);
    }
  };
  const [repositories, setRepositories] = useState([]),
    [selectedRepositories, setSelectedRepositories] = useState(null),
    [repositoryError, setRepositoryError] = useState(""),
    [loadingRepositories, setLoadingRepositories] = useState(false);
  const isImport =
    draft.tool === "issues_import_tapd" && !draft.saved && !draft.inherited;
  const projectId = draft.body?.projectId || "";
  useEffect(() => {
    let current = true;
    setRepositories([]);
    setSelectedRepositories(null);
    setRepositoryError("");
    setLoadingRepositories(isImport && !!projectId);
    if (isImport && projectId)
      api(
        "/api/assistant/references?" +
          new URLSearchParams({ projectId, type: "repository" }),
      )
        .then((rows) => {
          if (current)
            setRepositories(Array.isArray(rows) ? rows : rows.items || []);
        })
        .catch((e) => {
          if (current) setRepositoryError(operationError(e));
        })
        .finally(() => {
          if (current) setLoadingRepositories(false);
        });
    return () => {
      current = false;
    };
  }, [artifact.id, isImport, projectId]);
  const sharedSelection = context.repositorySelections?.[artifact.id];
  const selection = isImport
    ? sharedSelection?.projectId === projectId
      ? sharedSelection.ids
      : selectedRepositories
    : null;
  const ids = selection ?? repositoryIds(draft.body);
  const bodyPatch =
    selection === null ? null : { repositoryIds: ids, repositoryId: "" };
  const reviewed = bodyPatch
    ? { ...draft, body: { ...draft.body, ...bodyPatch } }
    : draft;
  const summary = operationSummary(reviewed, {
    ...context,
    references: [...repositories, ...(context.references || [])],
  });
  const validation = operationValidation(reviewed);
  const savedIssue =
    draft.saved && ["issues_save", "issues_import_tapd"].includes(draft.tool)
      ? draft.savedResult?.data || draft.savedResult
      : null;
  const target = definitionTarget(artifact);
  const entry = projectEntryTarget(draft, context.projectId);
  const Title = target ? "a" : "button";
  const Icon =
    artifact.kind === "role"
      ? UserRound
      : artifact.kind === "sop"
        ? GitBranch
        : Check;
  return (
    <div className="draft-card">
      <Title
        className="draft-title"
        {...(target
          ? { href: target.href, target: "_blank", rel: "noopener noreferrer" }
          : { onClick: () => onPreview(artifact) })}
      >
        <Icon size={17} />
        <span>
          <strong>{artifact.name}</strong>
          <small>
            {artifact.name !== actionName(draft.tool)
              ? `${actionName(draft.tool)} · `
              : ""}
            {declined
              ? draft.decision === "muted"
                ? chatT("未采纳，本会话不再建议", "Không chấp nhận, không đề xuất lại trong cuộc trò chuyện này")
                : draft.decision === "expired"
                  ? chatT("已超时", "Đã hết thời gian")
                  : draft.decision === "rejected"
                    ? chatT("AI 已拒绝", "AI đã từ chối", "AI rejected")
                    : chatT("未采纳", "Không chấp nhận", "Not accepted")
              : draft.saved
              ? chatT("已执行", "Đã thực thi")
              : draft.resolved
                ? chatT("已完成", "Đã hoàn tất")
                : draft.inherited
                  ? chatT("继承的历史记录", "Bản ghi lịch sử kế thừa")
                  : draft.proposal
                    ? chatT("AI 助手的建议", "Đề xuất của trợ lý AI")
                    : chatT("待确认", "Chờ xác nhận")}
          </small>
        </span>
        {target ? <ExternalLink size={16} /> : <ChevronRight size={16} />}
      </Title>
      <div className="operation-summary">
        {draft.proposal?.reason ? (
          <p className="proposal-reason">
            {draft.proposal.timing !== "start"
              ? chatT("可选的后续工作", "Công việc tiếp theo tùy chọn")
              : chatT("建议整件事走 SOP", "Đề xuất thực hiện toàn bộ công việc qua SOP")}
            ：{draft.proposal.reason}
          </p>
        ) : null}
        {remaining !== null ? (
          <p className="proposal-countdown" role="timer">
            {remaining > 0
              ? chatT(`${formatCountdown(remaining)} 后未确认，AI 助手将直接执行`, `Sau ${formatCountdown(remaining)} nếu chưa xác nhận, trợ lý AI sẽ trực tiếp thực thi`)
              : chatT("已超时，AI 助手即将直接执行", "Đã hết thời gian, trợ lý AI sắp trực tiếp thực thi")}
          </p>
        ) : null}
        {draft.review ? (
          <p className="muted">{chatT("帮我批准 ·", "Phê duyệt thay tôi ·")} {draft.review.model || chatT("AI 审查", "AI rà soát")}：{draft.review.rationale}</p>
        ) : null}
        <p>{summary.effect}</p>
        {summary.fields.length ? (
          <dl>
            {summary.fields.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd>{String(value)}</dd>
              </React.Fragment>
            ))}
          </dl>
        ) : null}
        {isImport ? (
          <fieldset className="operation-repositories">
            <legend>{chatT("关联代码仓库（必选）", "Liên kết kho mã (bắt buộc)")}</legend>
            {repositories.map((repository) => (
              <label key={repository.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(repository.id)}
                  disabled={busy || uncertain}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...ids, repository.id]
                      : ids.filter((id) => id !== repository.id);
                    if (context.onRepositorySelection)
                      context.onRepositorySelection(
                        artifact.id,
                        next,
                        projectId,
                      );
                    else setSelectedRepositories(next);
                  }}
                />
                <span>{repository.name || repository.id}</span>
              </label>
            ))}
            {!repositories.length ? (
              <p className="muted">
                {loadingRepositories
                  ? chatT("正在读取代码仓库…", "Đang đọc kho mã…")
                  : repositoryError ||
                    chatT("尚无可选仓库，请检查目标项目的仓库配置。", "Chưa có kho mã để chọn, kiểm tra cấu hình kho mã của dự án đích.")}
              </p>
            ) : null}
          </fieldset>
        ) : null}
        {!draft.saved && !draft.resolved && validation ? (
          <p className="warning" role="status">
            {validation}
          </p>
        ) : null}
        <details className="operation-parameters">
          <summary>{chatT("查看完整操作参数", "Xem tham số thao tác đầy đủ")}</summary>
          <pre className="artifact-source">
            {JSON.stringify(
              {
                tool: draft.tool,
                path: draft.path,
                query: draft.query,
                body: reviewed.body,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
      {entry ? (
        <a className="quiet-button project-entry" href={entry.href} target="_top">
          {entry.label}
        </a>
      ) : null}
      {draft.warnings?.map((w) => (
        <p className="warning" key={w}>
          {w}
        </p>
      ))}
      {error ? <p className="error">{error}</p> : null}
      {draft.decision === "expired" && !draft.inherited ? (
        <button type="button" className="quiet-button" disabled>
          {chatT("已超时，AI 助手直接执行", "Đã hết thời gian, trợ lý AI trực tiếp thực thi")}
        </button>
      ) : null}
      {!draft.inherited && !target && onApply && !declined ? (
        <button
          className={draft.saved ? "quiet-button" : "primary-button"}
          disabled={
            busy || uncertain || draft.saved || draft.resolved || !!validation
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onApply(artifact.messageIndex, artifact.draftIndex, {
                expected: {
                  tool: draft.tool,
                  path: draft.path,
                  query: draft.query,
                  body: draft.body,
                },
                bodyPatch,
              });
            } catch (e) {
              setError(operationError(e));
              if (e.executed) setUncertain(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {draft.resolved ? (
            chatT("已完成", "Đã hoàn tất")
          ) : draft.saved ? (
            <>
              <Check size={14} />
              {chatT("已执行", "Đã thực thi")}
            </>
          ) : busy ? (
            chatT("执行中…", "Đang thực thi…")
          ) : draft.proposal ? (
            draft.tool === "issues_save" ? chatT("建需求并走 SOP", "Tạo yêu cầu và chạy SOP") : chatT("走 SOP", "Chạy SOP")
          ) : (
            chatT(`确认${summary.title}`, `Xác nhận ${summary.title}`)
          )}
        </button>
      ) : null}
      {answerable ? (
        <div className="proposal-actions">
          <button
            type="button"
            className="quiet-button"
            disabled={busy}
            onClick={() => decide("declined")}
          >
            {draft.proposal.timing === "start" ? chatT("让 AI 助手自己做", "Để trợ lý AI tự làm") : chatT("不需要", "Không cần")}
          </button>
          <button
            type="button"
            className="proposal-mute"
            disabled={busy}
            onClick={() => decide("muted")}
          >
            {chatT("本会话不再建议", "Không đề xuất lại trong cuộc trò chuyện này")}
          </button>
        </div>
      ) : null}
      {savedIssue?.id &&
      context.onLinkIssue &&
      !context.runId &&
      (savedIssue.projectId || draft.body?.projectId) === context.projectId ? (
        <button
          type="button"
          className="quiet-button"
          disabled={context.issueId === savedIssue.id || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await context.onLinkIssue(savedIssue.id);
            } finally {
              setBusy(false);
            }
          }}
        >
          {context.issueId === savedIssue.id
            ? chatT("已关联到当前会话", "Đã liên kết với cuộc trò chuyện hiện tại")
            : chatT("关联到当前会话", "Liên kết với cuộc trò chuyện hiện tại")}
        </button>
      ) : null}
    </div>
  );
}
export default function SidePanel({
  chat,
  tab,
  setTab,
  selected,
  setSelected,
  onClose,
}) {
  const [workflows, setWorkflows] = useState([]),
    [runs, setRuns] = useState([]),
    [workflowId, setWorkflowId] = useState(""),
    [name, setName] = useState(""),
    [detail, setDetail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [openRun, setOpenRun] = useState(null);
  const artifacts = collectArtifacts(chat.session);
  const projectId = chat.session?.projectId || chat.projectId;
  async function load() {
    if (!projectId) {
      setWorkflows([]);
      setRuns([]);
      return;
    }
    try {
      const [w, r] = await Promise.all([
        api(`/api/workflows?projectId=${encodeURIComponent(projectId)}`),
        api(`/api/runs?projectId=${encodeURIComponent(projectId)}`),
      ]);
      setWorkflows(w || []);
      setRuns(r || []);
      setWorkflowId((current) =>
        w.some((x) => x.id === current) ? current : w[0]?.id || "",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, [projectId]);
  useEffect(() => {
    if (
      !runs.some(
        (r) =>
          !["succeeded", "failed", "canceled", "cancelled"].includes(r.status),
      )
    )
      return;
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [
    projectId,
    runs.some(
      (r) =>
        !["succeeded", "failed", "canceled", "cancelled"].includes(r.status),
    ),
  ]);
  async function action(kind) {
    setError("");
    if (!projectId) {
      setError(chatT("请先点右上角的项目名称选择或绑定项目。", "Trước tiên nhấp tên dự án ở góc trên bên phải để chọn hoặc liên kết dự án."));
      return;
    }
    if (!workflowId || !name.trim()) {
      setError(chatT("请填写名称并选择流程模板。", "Vui lòng điền tên và chọn mẫu quy trình."));
      return;
    }
    setBusy(true);
    try {
      if (kind === "clone") {
        const source = workflows.find((w) => w.id === workflowId);
        const id = "chat-sop-" + Date.now().toString(36);
        const response = await write("/mcp", {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "workflows_clone",
            arguments: {
              path: { id: source.id },
              body: { id, name: name.trim(), projectId },
            },
          },
        });
        if (response.error || response.result?.isError)
          throw Error(
            response.error?.message ||
              response.result?.content?.[0]?.text ||
              chatT("创建失败", "Tạo thất bại"),
          );
        setWorkflowId(id);
      } else {
        const issue = await write("/api/issues", {
          projectId,
          workflowId,
          title: name.trim(),
          description: detail,
        });
        await write(`/api/issues/${encodeURIComponent(issue.id)}/dispatch`, {
          workflowId,
        });
      }
      setName("");
      setDetail("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const status = {
    succeeded: chatT("已完成", "Đã hoàn tất"),
    running: chatT("进行中", "Đang thực hiện"),
    waiting: chatT("等待审批", "Chờ phê duyệt"),
    pending: chatT("排队中", "Đang xếp hàng"),
    queued: chatT("排队中", "Đang xếp hàng"),
    failed: chatT("失败", "Thất bại"),
    canceled: chatT("已取消", "Đã hủy"),
    cancelled: chatT("已取消", "Đã hủy"),
  };
  async function selectRun(run) {
    try {
      const stored = await api(`/api/runs/${encodeURIComponent(run.id)}`);
      setOpenRun(stored);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <aside className="side-panel" aria-label={chatT("产物与 SOP", "Sản phẩm đầu ra và SOP")}>
      <header className="panel-tabs">
        <SlidingTabs aria-label={chatT("右侧面板", "Bảng bên phải")}>
          <button
            role="tab"
            aria-selected={tab === "files"}
            onClick={() => {
              setTab("files");
              setSelected(null);
            }}
          >
            <Folder size={14} />
            {chatT("产物", "Sản phẩm đầu ra")}
            {artifacts.length ? (
              <span className="count">{artifacts.length}</span>
            ) : null}
          </button>
          <button
            role="tab"
            aria-selected={tab === "sop"}
            onClick={() => {
              setTab("sop");
              setSelected(null);
            }}
          >
            <GitBranch size={14} />
            SOP
          </button>
        </SlidingTabs>
        <IconButton label={chatT("关闭侧边栏", "Đóng thanh bên")} onClick={onClose}>
          <X size={17} />
        </IconButton>
      </header>
      <div className="panel-content">
        {selected ? (
          <>
            <button className="back-link" onClick={() => setSelected(null)}>
              {chatT("← 所有产物", "← Mọi sản phẩm đầu ra")}
            </button>
            <ArtifactPreview artifact={selected} />
            {selected.draft ? (
              <DraftCard
                artifact={selected}
                onApply={chat.readOnly ? null : chat.applyDraft}
                onPreview={() => {}}
              />
            ) : null}
          </>
        ) : tab === "files" ? (
          <>
            <div className="panel-heading">
              <h2>{chatT("会话产物", "Sản phẩm đầu ra cuộc trò chuyện")}</h2>
              <small>
                {chat.projects.find((p) => p.id === projectId)?.name ||
                  chatT("个人对话", "Cuộc trò chuyện cá nhân")}
              </small>
            </div>
            {!artifacts.length ? (
              <div className="panel-empty">
                <File size={28} />
                <h3>{chatT("产物会显示在这里", "Sản phẩm đầu ra sẽ xuất hiện tại đây")}</h3>
                <p>
                  {chatT("对话中的图片、文件、图表、代码和 SOP 草稿会自动汇集，点击即可查看。", "Hình ảnh, tệp, biểu đồ, mã và bản nháp SOP trong cuộc trò chuyện được tự động tập hợp tại đây. Nhấp để xem.")}
                </p>
              </div>
            ) : (
              <div className="artifact-list">
                {artifacts.map((artifact) => (
                  <button
                    className="artifact-row"
                    key={artifact.id}
                    onClick={() => setSelected(artifact)}
                  >
                    {artifact.mimeType?.startsWith("image/") ? (
                      <FileImage size={19} />
                    ) : artifact.kind === "sop" ? (
                      <GitBranch size={19} />
                    ) : (
                      <File size={19} />
                    )}
                    <span>
                      <strong>{artifact.name}</strong>
                      <small>
                        {artifact.source}
                        {artifact.size
                          ? ` · ${(artifact.size / 1024).toFixed(0)} KB`
                          : ""}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="panel-heading">
              <h2>SOP</h2>
              <IconButton label={chatT("刷新 SOP 与运行", "Làm mới SOP và lượt chạy")} onClick={() => void load()}>
                <RefreshCw size={16} />
              </IconButton>
            </div>
            <label className="field">
              {chatT("项目", "Dự án")}
              <div className="project-static">
                <Folder size={14} />
                {chat.projects.find((p) => p.id === projectId)?.name ||
                  chatT("尚未绑定项目", "Chưa liên kết dự án")}
              </div>
            </label>
            <label className="field">
              {chatT("名称", "Tên")}
              <input
                placeholder={chatT("新流程或这次要做的事", "Quy trình mới hoặc việc cần làm lần này")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              {chatT("说明", "Mô tả")}
              <textarea
                rows={3}
                placeholder={chatT("派发时会成为需求说明", "Sẽ trở thành mô tả yêu cầu khi điều phối")}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </label>
            <label className="field">
              {chatT("流程模板", "Mẫu quy trình")}
              <HarnessSelect
                value={workflowId}
                ariaLabel={chatT("流程模板", "Mẫu quy trình")}
                onChange={(e) => setWorkflowId(e.target.value)}
                options={workflows.map((w) => ({ value: w.id, label: w.name }))}
              />
            </label>
            {workflowId ? (
              <button
                className="definition-link"
                onClick={() =>
                  setSelected({
                    id: "workflow-" + workflowId,
                    name:
                      workflows.find((w) => w.id === workflowId)?.name ||
                      chatT("SOP 定义", "Định nghĩa SOP"),
                    kind: "sop",
                    content: JSON.stringify(
                      workflows.find((w) => w.id === workflowId),
                      null,
                      2,
                    ),
                    source: chatT("项目 SOP", "SOP của dự án"),
                  })
                }
              >
                <ChevronRight size={14} />
                {chatT("查看 SOP 定义", "Xem định nghĩa SOP")}
              </button>
            ) : null}
            <div className="button-row">
              <button
                disabled={busy}
                className="quiet-button"
                onClick={() => action("clone")}
              >
                {chatT("创建 SOP", "Tạo SOP")}
              </button>
              <button
                disabled={busy}
                className="primary-button"
                onClick={() => action("dispatch")}
              >
                <Play size={13} />
                {busy ? chatT("处理中…", "Đang xử lý…") : chatT("派发 SOP", "Điều phối SOP")}
              </button>
            </div>
            {error ? (
              <p role="alert" className="error">
                {error}
              </p>
            ) : null}
            <section className="panel-section">
              <h3>{chatT("聊天生成的操作草稿", "Bản nháp thao tác tạo qua trò chuyện")}</h3>
              {artifacts
                .filter((a) => a.kind === "sop")
                .map((a) => (
                  <DraftCard
                    key={a.id}
                    artifact={a}
                    onApply={async (...args) => {
                      const result = await chat.applyDraft(...args);
                      await load();
                      return result;
                    }}
                    onPreview={setSelected}
                  />
                ))}
              {!artifacts.some((a) => a.kind === "sop") ? (
                <p className="muted">
                  {chatT("在聊天中描述要创建或派发的 SOP，草稿将在这里等待确认。", "Mô tả SOP cần tạo hoặc điều phối trong trò chuyện; bản nháp sẽ chờ xác nhận tại đây.")}
                </p>
              ) : null}
            </section>
            <section className="panel-section">
              <h3>{chatT("项目运行", "Lượt chạy dự án")}</h3>
              {runs.map((run) => (
                <button
                  className="run-row"
                  key={run.id}
                  onClick={() => selectRun(run)}
                >
                  <span>
                    {run.workflowSnapshot?.name ||
                      workflows.find((w) => w.id === run.workflowId)?.name ||
                      run.workflowId}
                  </span>
                  <small className={`run-status ${run.status}`}>
                    {status[run.status] || run.status}
                  </small>
                </button>
              ))}
              {!runs.length ? (
                <p className="muted">{chatT("这个项目暂时没有运行。", "Dự án này hiện chưa có lượt chạy.")}</p>
              ) : null}
            </section>
            {openRun ? (
              <section className="panel-section">
                <h3>{openRun.workflowSnapshot?.name || openRun.id}</h3>
                <p className="muted">{openRun.input}</p>
                {Object.entries(openRun.nodes || {}).map(([id, node]) => (
                  <details key={id}>
                    <summary>
                      {openRun.workflowSnapshot?.nodes?.find((n) => n.id === id)
                        ?.name || id}
                      <small>{status[node.status] || node.status}</small>
                    </summary>
                    <pre>{node.output || chatT("暂无输出", "Chưa có đầu ra")}</pre>
                  </details>
                ))}
                {openRun.artifacts?.map((a) => (
                  <button
                    key={a.id}
                    className="artifact-row"
                    onClick={() =>
                      setSelected({
                        ...a,
                        mimeType: a.mediaType,
                        kind: a.mediaType === "image/svg+xml" ? "svg" : "code",
                        source: chatT("SOP 运行产物", "Sản phẩm đầu ra của lượt chạy SOP"),
                        url: `/api/runs/${encodeURIComponent(openRun.id)}/artifacts/${encodeURIComponent(a.id)}`,
                      })
                    }
                  >
                    <File size={16} />
                    {a.name || a.path}
                  </button>
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
