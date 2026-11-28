import { chatT } from "./locale";
import React, { useEffect, useMemo, useRef, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import SlidingTabs from "./SlidingTabs";
import HarnessSelect from "./HarnessSelect";
import { api } from "./api";
import { RichContent, ArtifactPreview, ImageLightbox } from "./RichContent";
import KnowledgeSources from "./KnowledgeSources";
import {
  buildKnowledgeSummary,
  filterKnowledgeReadsForAttempt,
} from "./knowledge-citations.js";
import { IconButton, CredentialAction } from "./ui";
import ActivityTrace from "./ActivityTrace";
import {
  groupNodeActivity,
  nodeConversationItems,
} from "./node-conversation.js";
import { approvalWaitReason } from "./runs.js";

const GitBranch = (props) => <HarnessIcon name="workflow" {...props} />;
const X = (props) => <HarnessIcon name="close" {...props} />;
const Check = (props) => <HarnessIcon name="check" {...props} />;
const Circle = (props) => <HarnessIcon name="circle" {...props} />;
const LoaderCircle = (props) => (
  <HarnessIcon name="spinner" motion="busy" {...props} />
);
const AlertCircle = (props) => <HarnessIcon name="alert" {...props} />;
const Clock3 = (props) => <HarnessIcon name="clock" {...props} />;
const ChevronLeft = (props) => <HarnessIcon name="chevron-left" {...props} />;
const ChevronRight = (props) => <HarnessIcon name="chevron-right" {...props} />;
const FileText = (props) => <HarnessIcon name="doc" {...props} />;
const MessageSquare = (props) => <HarnessIcon name="chat" {...props} />;
const FileImage = (props) => <HarnessIcon name="image" {...props} />;
const Download = (props) => <HarnessIcon name="download" {...props} />;

function runArtifact(run, artifact) {
  const path = artifact.path || artifact.name;
  const kind = /\.html?$/i.test(path)
    ? "html"
    : /\.svg$/i.test(path)
      ? "svg"
      : /\.mmd$/i.test(path)
        ? "mermaid"
        : "attachment";
  return {
    ...artifact,
    name: path,
    kind,
    url: `/api/runs/${encodeURIComponent(run.id)}/artifacts/${encodeURIComponent(artifact.id)}`,
    mimeType: artifact.mediaType,
    source: chatT("节点产物", "Sản phẩm đầu ra của bước"),
  };
}

function NodeArtifact({ run, artifact, onPreview }) {
  const file = runArtifact(run, artifact);
  const image = file.mimeType?.startsWith("image/");
  const [zoom, setZoom] = useState(false);
  return (
    <div className="node-inline-artifact" data-artifact-id={artifact.id}>
      {zoom ? (
        <ImageLightbox
          src={file.url}
          alt={file.name}
          onClose={() => setZoom(false)}
        />
      ) : null}
      <button
        className="node-artifact-open"
        onClick={() => onPreview(file)}
        onDoubleClick={image ? () => setZoom(true) : undefined}
        title={image ? chatT("单击预览，双击查看大图", "Nhấp để xem trước, nhấp đúp để xem ảnh lớn") : undefined}
        aria-label={chatT(`预览 ${file.name}`, `Xem trước ${file.name}`)}
      >
        {image ? <img src={file.url} alt={file.name} loading="lazy" /> : null}
        <span className="node-artifact-file">
          {image ? <FileImage size={18} /> : <FileText size={18} />}
          <span>
            <strong>{file.name}</strong>
            <small>
              {image ? chatT("图片", "Hình ảnh") : chatT("文件", "Tệp")}
              {file.size
                ? ` · ${file.size < 1024 ? `${file.size} B` : `${Math.ceil(file.size / 1024)} KB`}`
                : ""}
            </small>
          </span>
          <ChevronRight size={14} />
        </span>
      </button>
      <a
        className="icon-button node-artifact-download"
        href={file.url}
        download={file.name}
        aria-label={chatT(`下载 ${file.name}`, `Tải ${file.name} xuống`)}
      >
        <Download size={15} />
      </a>
    </div>
  );
}

export const runStatus = {
  succeeded: chatT("已完成", "Đã hoàn tất"),
  running: chatT("运行中", "Đang chạy"),
  waiting: chatT("等待审批", "Chờ phê duyệt"),
  waiting_approval: chatT("等待审批", "Chờ phê duyệt"),
  pending: chatT("待执行", "Chờ thực thi"),
  queued: chatT("排队中", "Đang xếp hàng"),
  failed: chatT("失败", "Thất bại"),
  canceled: chatT("已取消", "Đã hủy"),
  cancelled: chatT("已取消", "Đã hủy"),
  skipped: chatT("已跳过", "Đã bỏ qua"),
  paused: chatT("已暂停", "Đã tạm dừng"),
};
const statusIcon = (status) =>
  status === "succeeded"
    ? Check
    : status === "running"
      ? LoaderCircle
      : status === "failed"
        ? AlertCircle
        : ["waiting", "waiting_approval"].includes(status)
          ? Clock3
          : Circle;

function NodeConversation({ run, node, definition, onPreview }) {
  const [events, setEvents] = useState([]),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const loadRef = useRef(null),
    statusRef = useRef(node.status);
  statusRef.current = node.status;
  useEffect(() => {
    let cancelled = false,
      busy = false,
      cursor = 0;
    setEvents([]);
    setMore(false);
    async function load() {
      if (busy || cancelled) return;
      busy = true;
      setLoading(true);
      try {
        // Token telemetry can fill the first page before publication. Drain a
        // bounded batch automatically, preserving the real publication order.
        for (let batch = 0; batch < 10; batch++) {
          const page = await api(
            `/api/runs/${encodeURIComponent(run.id)}/telemetry?nodeId=${encodeURIComponent(node.nodeId)}&after=${cursor}&limit=500&expanded=true`,
          );
          if (cancelled) return;
          setEvents((old) => {
            const seen = new Set(old.map((e) => e.sequence));
            return [
              ...old,
              ...page.events.filter((e) => !seen.has(e.sequence)),
            ];
          });
          setMore(page.hasMore);
          setError("");
          const next = page.nextAfter || cursor;
          if (!page.hasMore || next <= cursor) {
            cursor = next;
            break;
          }
          cursor = next;
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        busy = false;
        if (!cancelled) setLoading(false);
      }
    }
    loadRef.current = load;
    void load();
    const timer = setInterval(() => {
      if (
        !["succeeded", "failed", "skipped", "canceled", "cancelled"].includes(
          statusRef.current,
        )
      )
        void load();
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
      loadRef.current = null;
    };
  }, [run.id, node.nodeId, node.attempt]);
  useEffect(() => {
    void loadRef.current?.();
  }, [node.status]);
  const items = groupNodeActivity(
    nodeConversationItems(events, run.artifacts || [], node, {
      hasMore: more,
    }),
    { live: ["running", "queued"].includes(node.status) },
  );
  const sourceIDs = new Set(
    (run.workflowSnapshot?.edges || [])
      .filter((edge) => edge.target === node.nodeId)
      .map((edge) => edge.source),
  );
  const handoffs = (run.workflowSnapshot?.nodes || [])
    .filter(
      (source) => sourceIDs.has(source.id) && run.nodes?.[source.id]?.output,
    )
    .map((source) => ({
      ...source,
      output: run.nodes[source.id].output,
      knowledgeReads: filterKnowledgeReadsForAttempt(
        run.nodes?.[source.id]?.knowledgeReads,
        run.nodes?.[source.id]?.attempt,
      ),
    }));
  const [highlightedCite, setHighlightedCite] = useState(null);
  const sourcesRef = useRef(null);
  const highlightTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);
  const handleCitationClick = (citeIndex) => {
    setHighlightedCite(citeIndex);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedCite(null), 2000);
    const row = sourcesRef.current?.querySelector?.(`[data-cite-index="${citeIndex}"]`);
    row?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  };
  const nodeReads = useMemo(
    () => filterKnowledgeReadsForAttempt(node.knowledgeReads, node.attempt),
    [node.knowledgeReads, node.attempt],
  );
  const nodeLive = ["running", "queued"].includes(node.status);
  const nodeTexts = useMemo(() => {
    const narrationTexts = items.flatMap((item) =>
      Array.isArray(item.steps)
        ? item.steps.filter((s) => s.kind === "text" && s.text).map((s) => s.text)
        : [],
    );
    return [
      node.output || "",
      ...narrationTexts,
      ...items.filter((i) => i.type === "reply").map((i) => i.message || ""),
    ];
  }, [node.output, items]);
  const nodeSummary = useMemo(
    () =>
      nodeReads.length
        ? buildKnowledgeSummary(nodeReads, nodeTexts, { live: nodeLive })
        : null,
    [nodeReads, nodeTexts, nodeLive],
  );
  const nodeKnowledgeText = nodeTexts.join("\n");
  const opening = run.input || "";
  return (
    <div className="node-conversation">
      {opening || handoffs.length ? (
        <article
          className="node-message node-message-user"
          aria-label={chatT("收到的消息", "Tin nhắn đã nhận")}
        >
          {opening ? <RichContent message={opening} /> : null}
          {handoffs.map((source) => (
            <div className="node-handoff-message" key={source.id}>
              <span className="node-message-sender">
                {source.name || source.id}
              </span>
              <RichContent
                message={source.output}
                knowledgeReads={source.knowledgeReads}
              />
            </div>
          ))}
        </article>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {items.map((item) =>
        item.type === "artifact" ? (
          <NodeArtifact
            key={item.key}
            run={run}
            artifact={item.artifact}
            onPreview={onPreview}
          />
        ) : item.type === "reply" ? (
          <article
            className="node-message node-message-assistant node-result"
            aria-label={chatT("节点回复", "Phản hồi bước")}
            key={item.key}
          >
            <RichContent
              message={item.message}
              knowledgeReads={nodeReads}
              knowledgeSummary={nodeSummary}
              streaming={nodeLive}
              onCitationClick={handleCitationClick}
            />
          </article>
        ) : (
          <ActivityTrace
            key={item.key}
            steps={item.steps}
            startedAt={item.startedAt}
            finishedAt={item.finishedAt}
            live={item.live}
            citationProps={
              nodeReads.length
                ? {
                    knowledgeReads: nodeReads,
                    knowledgeSummary: nodeSummary,
                    streaming: nodeLive,
                    onCitationClick: handleCitationClick,
                  }
                : null
            }
          />
        ),
      )}
      {more ? (
        <button
          className="quiet-button"
          disabled={loading}
          onClick={() => void loadRef.current?.()}
        >
          {loading ? chatT("正在读取完整会话…", "Đang đọc toàn bộ cuộc trò chuyện…") : chatT("加载更多执行记录", "Tải thêm bản ghi thực thi")}
        </button>
      ) : null}
      {definition?.type === "approval" && node.status !== "pending" ? (
        <article
          className="node-message node-message-assistant node-approval-reason"
          aria-label={chatT("人工门禁说明", "Mô tả điểm kiểm soát của con người")}
        >
          <strong>
            {node.status === "waiting_approval"
              ? chatT("为什么需要人工确认", "Vì sao cần con người xác nhận")
              : chatT("人工门禁", "Điểm kiểm soát của con người")}
          </strong>
          <p>{approvalWaitReason(run, node.nodeId || definition.id)}</p>
        </article>
      ) : !items.length && !loading ? (
        <p className="muted">
          {node.status === "pending"
            ? chatT("节点尚未开始。", "Bước chưa bắt đầu.")
            : chatT("暂无可读取的执行记录。", "Chưa có bản ghi thực thi có thể đọc.")}
        </p>
      ) : null}
      {nodeReads.length > 0 ? (
        <KnowledgeSources
          knowledgeReads={nodeReads}
          text={nodeKnowledgeText}
          summary={nodeSummary}
          highlightedIndex={highlightedCite}
          containerRef={sourcesRef}
        />
      ) : null}
      {node.error ? (
        <p className="error">
          {node.error}
          <CredentialAction text={node.error} />
        </p>
      ) : null}
    </div>
  );
}
export default function SopRunPanel({
  runs,
  onClose,
  embedded = false,
  selectedNodeId,
  onSelectNode,
}) {
  const [runId, setRunId] = useState(runs[0]?.id),
    [localNodeId, setLocalNodeId] = useState(null),
    [tab, setTab] = useState("conversation"),
    [artifact, setArtifact] = useState(null);
  const nodeId = onSelectNode ? selectedNodeId : localNodeId;
  const setNodeId = onSelectNode || setLocalNodeId;
  const run = runs.find((r) => r.id === runId) || runs[0];
  useEffect(() => {
    setNodeId(null);
    setArtifact(null);
  }, [run?.id]);
  useEffect(() => {
    setArtifact(null);
    setTab("conversation");
  }, [nodeId]);
  if (!run) return null;
  const nodes = run.workflowSnapshot?.nodes || [];
  const definition = nodes.find((n) => n.id === nodeId);
  const node =
    run.nodes?.[nodeId] || (definition ? { nodeId, status: "pending" } : null);
  const completed = nodes.filter((n) =>
    ["succeeded", "skipped"].includes(run.nodes?.[n.id]?.status),
  ).length;
  const artifacts = (run.artifacts || []).filter(
    (a) => !nodeId || a.nodeId === nodeId,
  );
  const title = run.workflowSnapshot?.name || chatT("LOOP 运行", "Lượt chạy LOOP");
  const Container = embedded ? "section" : "aside";
  return (
    <Container
      className={`${embedded ? "sop-run-embedded" : "side-panel"} sop-run-panel ${nodeId ? "node-conversation-view" : ""}`}
      aria-label={chatT("LOOP 运行过程", "Quá trình chạy LOOP")}
    >
      {!embedded ? (
        <header className="sop-panel-header">
          <span>
            <GitBranch size={16} />
            {chatT("LOOP 运行", "Lượt chạy LOOP")}
          </span>
          <IconButton label={chatT("关闭运行侧边栏", "Đóng thanh bên lượt chạy")} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
      ) : null}
      <div className="sop-panel-scroll">
        {runs.length > 1 ? (
          <HarnessSelect
            ariaLabel={chatT("选择会话关联运行", "Chọn lượt chạy liên kết với cuộc trò chuyện")}
            value={run.id}
            onChange={(e) => setRunId(e.target.value)}
            options={runs.map((r) => ({ value: r.id, label: r.workflowSnapshot?.name || r.id }))}
          />
        ) : null}
        {!nodeId ? (
          <div className="sop-run-heading">
            <h2>{title}</h2>
            <span className={`sop-status status-${run.status}`}>
              {runStatus[run.status] || run.status}
            </span>
            <small>
              {chatT(`${completed} / ${nodes.length} 个节点已完成`, `Đã hoàn tất ${completed} / ${nodes.length} bước`)}
            </small>
            <div className="sop-progress">
              <i
                style={{
                  width: `${nodes.length ? (completed / nodes.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        {artifact ? (
          <>
            <button className="back-link" onClick={() => setArtifact(null)}>
              <ChevronLeft size={14} />
              {tab === "conversation" ? chatT("返回会话", "Quay lại cuộc trò chuyện") : chatT("返回节点产物", "Quay lại đầu ra bước")}
            </button>
            <ArtifactPreview
              artifact={artifact}
              attempt={artifact.attempt}
              knowledgeReads={run.nodes?.[artifact.nodeId]?.knowledgeReads || []}
            />
          </>
        ) : nodeId && node ? (
          <>
            {!embedded ? (
              <button className="back-link" onClick={() => setNodeId(null)}>
                <ChevronLeft size={14} />
                {chatT("全部流程节点", "Mọi bước quy trình")}
              </button>
            ) : null}
            <SlidingTabs className="node-tabs" aria-label={chatT("节点详情", "Chi tiết bước")}>
              <button
                role="tab"
                aria-selected={tab === "conversation"}
                onClick={() => setTab("conversation")}
              >
                <MessageSquare size={14} />
                {chatT("会话过程", "Quá trình trò chuyện")}
              </button>
              <button
                role="tab"
                aria-selected={tab === "artifacts"}
                onClick={() => setTab("artifacts")}
              >
                <FileText size={14} />
                {chatT("产物", "Sản phẩm đầu ra")} {artifacts.length || ""}
              </button>
            </SlidingTabs>
            {tab === "conversation" ? (
              <NodeConversation
                key={`${run.id}:${nodeId}`}
                run={run}
                node={node}
                definition={definition}
                onPreview={setArtifact}
              />
            ) : (
              <div className="node-artifacts">
                {artifacts.map((a) => (
                  <button
                    className="artifact-row"
                    key={a.id}
                    onClick={() => setArtifact(runArtifact(run, a))}
                  >
                    <FileText size={17} />
                    <span>
                      <strong>{a.path || a.name}</strong>
                      <small>
                        {chatT(`第 ${a.attempt} 次执行 · ${a.size} 字节`, `Lần thực thi ${a.attempt} · ${a.size} byte`)}
                      </small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
                {!artifacts.length ? (
                  <p className="muted">{chatT("这个节点尚未生成产物。", "Bước này chưa tạo sản phẩm đầu ra.")}</p>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <ol className="sop-node-list">
            {nodes.map((definition, index) => {
              const node = run.nodes?.[definition.id] || { status: "pending" };
              const Icon = statusIcon(node.status);
              return (
                <li key={definition.id} className={`status-${node.status}`}>
                  <button
                    onClick={() => {
                      setNodeId(definition.id);
                      setTab("conversation");
                      setArtifact(null);
                    }}
                  >
                    <span className="sop-node-marker">
                      <Icon size={15} />
                    </span>
                    <span>
                      <strong>{definition.name || definition.id}</strong>
                      <small>
                        {runStatus[node.status] || node.status}
                        {node.activity && node.status === "running"
                          ? ` · ${node.activity}`
                          : ""}
                      </small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {!nodeId ? (
          <footer className="sop-run-footnote">{run.id}</footer>
        ) : null}
      </div>
    </Container>
  );
}
