import { chatT } from "./locale";
import React, { useEffect, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import { api } from "./api";
import { Dialog } from "./ui";
export function issueHref(id, projectId) {
  return `/?projectId=${encodeURIComponent(projectId)}&issueId=${encodeURIComponent(id)}#/issues`;
}
export default function IssueContext({
  chat,
  open: controlledOpen,
  onClose,
  hideTrigger = false,
}) {
  const [issue, setIssue] = useState(null),
    [internalOpen, setInternalOpen] = useState(false),
    [query, setQuery] = useState(""),
    [rows, setRows] = useState([]),
    [next, setNext] = useState(0),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const open = controlledOpen ?? internalOpen;
  const unavailable =
    !chat.projectId ||
    chat.busy ||
    (chat.activeId && !chat.session) ||
    chat.session?.shared ||
    chat.readOnly;
  function close() {
    setInternalOpen(false);
    onClose?.();
  }
  useEffect(() => {
    let current = true;
    setIssue(null);
    if (chat.issueId)
      api(`/api/issues/${encodeURIComponent(chat.issueId)}`)
        .then((data) => {
          if (current) setIssue(data.issue || data);
        })
        .catch(() => {});
    return () => {
      current = false;
    };
  }, [chat.issueId, chat.activeId]);
  useEffect(() => {
    if (!open || unavailable) return;
    let current = true;
    setRows([]);
    setError("");
    setNext(0);
    setLoading(true);
    const timer = setTimeout(() => {
      api(
        "/api/assistant/references?" +
          new URLSearchParams({
            projectId: chat.projectId,
            type: "issue",
            q: query,
          }),
      )
        .then((data) => {
          if (current) {
            setRows(data.items || data);
            setNext(data.nextOffset || 0);
          }
        })
        .catch((e) => {
          if (current) setError(e.message);
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 150);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [open, chat.projectId, query, unavailable]);
  async function choose(id) {
    if (unavailable || saving) return;
    setSaving(true);
    try {
      if (await chat.linkIssue(id)) {
        close();
        setQuery("");
      }
    } finally {
      setSaving(false);
    }
  }
  async function more() {
    if (unavailable || loading) return;
    setLoading(true);
    try {
      const data = await api(
        "/api/assistant/references?" +
          new URLSearchParams({
            projectId: chat.projectId,
            type: "issue",
            q: query,
            offset: String(next),
          }),
      );
      setRows((old) => [...old, ...(data.items || data)]);
      setNext(data.nextOffset || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      {!hideTrigger ? (
        <>
          <button
            type="button"
            className="context-pill issue-context"
            title={
              chat.session?.shared
                ? chatT("需求由当前运行关联", "Yêu cầu được liên kết bởi lượt chạy hiện tại")
                : chatT("关联当前会话的主需求；其他 @引用只作用于当前消息", "Liên kết yêu cầu chính của cuộc trò chuyện; các tham chiếu @ khác chỉ áp dụng cho tin nhắn hiện tại")
            }
            disabled={unavailable}
            onClick={() => setInternalOpen(true)}
          >
            <HarnessIcon name="doc" size={14} />
            <span>
              {chat.issueId ? issue?.title || chat.issueId : chatT("关联需求", "Liên kết yêu cầu")}
            </span>
          </button>
          {chat.issueId ? (
            <a
              className="issue-open"
              href={issueHref(chat.issueId, chat.projectId)}
              target="_blank"
              rel="noreferrer"
              title={chatT("打开关联需求", "Mở yêu cầu đã liên kết")}
              aria-label={chatT("打开关联需求", "Mở yêu cầu đã liên kết")}
            >
              <HarnessIcon name="preview-expand" size={13} />
            </a>
          ) : null}
        </>
      ) : null}
      {open ? (
        <Dialog title={chatT("会话主需求", "Yêu cầu chính của cuộc trò chuyện")} onClose={close}>
          <div className="issue-selector">
            <p>
              {chatT("选择此会话持续讨论的主需求。关联后每轮读取最新内容，会话的可见范围不变。", "Chọn yêu cầu chính để tiếp tục thảo luận trong cuộc trò chuyện này. Sau khi liên kết, mỗi lượt đọc nội dung mới nhất; phạm vi hiển thị cuộc trò chuyện không đổi.")}
            </p>
            {chat.issueId ? (
              <p>
                {chatT("已关联：", "Đã liên kết:")}
                <a
                  href={issueHref(chat.issueId, chat.projectId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {issue?.title || chat.issueId}
                </a>
              </p>
            ) : null}
            <input
              autoFocus
              aria-label={chatT("搜索关联需求", "Tìm yêu cầu đã liên kết")}
              placeholder={chatT("搜索当前项目的需求…", "Tìm yêu cầu trong dự án hiện tại…")}
              value={query}
              disabled={unavailable || saving}
              onChange={(e) => setQuery(e.target.value)}
            />
            {chat.issueId ? (
              <button
                type="button"
                className="quiet-button"
                disabled={unavailable || saving}
                onClick={() => choose("")}
              >
                {chatT("解除关联", "Hủy liên kết")}
              </button>
            ) : null}
            <div className="issue-options">
              {rows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  disabled={unavailable || saving}
                  onClick={() => choose(row.id)}
                  aria-pressed={chat.issueId === row.id}
                >
                  <HarnessIcon name="doc" size={16} />
                  <span>
                    {row.name}
                    <small>{row.id}</small>
                  </span>
                  {chat.issueId === row.id ? chatT("已关联", "Đã liên kết") : ""}
                </button>
              ))}
            </div>
            {loading ? <p role="status">{chatT("正在查找…", "Đang tìm…")}</p> : null}
            {!loading && !rows.length && !error ? (
              <p>{chatT("没有匹配的需求；可先在聊天中创建或导入。", "Không có yêu cầu phù hợp; có thể tạo hoặc nhập qua trò chuyện trước.")}</p>
            ) : null}
            {error ? <p role="alert">{error}</p> : null}
            {next ? (
              <button
                className="quiet-button"
                disabled={loading || unavailable || saving}
                onClick={more}
              >
                {chatT("加载更多", "Tải thêm")}
              </button>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
