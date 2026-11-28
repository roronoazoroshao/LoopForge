import { chatT } from "./locale";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import HarnessIcon from "./HarnessIcon";
import { api } from "./api";
import { referenceTypes, referenceTypeLabel, referenceTypeHint } from "./mentions.js";
import { usePanelPresence } from "./usePanelPresence";
import "./mention-context.css";

const icons = {
  agent: "user",
  skill: "skills",
  issue: "doc",
  sop: "branch",
  run: "play",
  repository: "folder",
};

const mirroredProperties = [
  "boxSizing",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "tabSize",
  "textAlign",
  "textIndent",
  "textTransform",
  "wordSpacing",
  "wordBreak",
  "overflowWrap",
];

function mentionAnchor(editor, caret) {
  if (!editor) return null;
  const editorRect = editor.getBoundingClientRect();
  const style = getComputedStyle(editor);
  const lineHeight =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 20;
  const mirror = document.createElement("div");
  const marker = document.createElement("span");
  for (const property of mirroredProperties)
    mirror.style[property] = style[property];
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.position = "fixed";
  mirror.style.left = `${editorRect.left}px`;
  mirror.style.top = `${editorRect.top - editor.scrollTop}px`;
  mirror.style.width = `${editor.clientWidth || editorRect.width}px`;
  mirror.style.minHeight = "0";
  mirror.style.height = "auto";
  mirror.style.border = "0";
  mirror.style.overflow = "visible";
  marker.style.display = "inline-block";
  marker.style.width = "1px";
  marker.style.height = `${lineHeight}px`;
  marker.textContent = "\u200b";
  mirror.append(document.createTextNode(editor.value.slice(0, caret)), marker);
  document.body.append(mirror);
  const markerRect = marker.getBoundingClientRect();
  mirror.remove();
  const fallbackTop =
    editorRect.top +
    (parseFloat(style.paddingTop) || 0) +
    (editor.value.slice(0, caret).match(/\n/g) || []).length * lineHeight -
    editor.scrollTop;
  const top = markerRect.height ? markerRect.top : fallbackTop;
  const bottom = markerRect.height ? markerRect.bottom : top + lineHeight;
  return {
    top,
    bottom,
    left: editorRect.left,
    right: editorRect.right || editorRect.left + editorRect.width,
    width: editorRect.width || editor.clientWidth,
  };
}

export { mentionAnchor };

export default forwardRef(function MentionPicker(
  {
    projectId,
    trigger,
    onSelect,
    onClose,
    onRestoreFocus,
    editor,
    issueId,
    onManageIssue,
    canManageIssue = false,
  },
  ref,
) {
  const open = !!trigger;
  const presence = usePanelPresence(open, 280);
  const [type, setType] = useState(""),
    [query, setQuery] = useState(trigger?.query || ""),
    [rows, setRows] = useState([]),
    [next, setNext] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [active, setActive] = useState(0);
  const root = useRef(null),
    request = useRef(0),
    openRef = useRef(open);
  openRef.current = open;
  const categories = !type && !query.trim();
  const options = categories ? referenceTypes : rows;
  const currentIssue = rows.find(
    (row) => row.type === "issue" && row.id === issueId,
  );
  useEffect(() => {
    if (!open) return;
    setQuery(trigger.query);
    setType("");
  }, [open, trigger?.query]);
  async function load(offset = 0) {
    if (!openRef.current) return;
    const version = ++request.current;
    setLoading(true);
    setError("");
    try {
      const data = await api(
        "/api/assistant/references?" +
          new URLSearchParams({
            projectId,
            // A project conversation only references its own project's
            // objects (plus shared ones); a personal one searches them all.
            ...(projectId ? {} : { scope: "all" }),
            type,
            q: query.trim(),
            offset: String(offset),
          }),
      );
      if (version !== request.current || !openRef.current) return;
      const items = (data.items || data).filter((item) =>
        referenceTypes.some((reference) => reference.type === item.type),
      );
      setRows((old) => offset ? [...old, ...items] : items);
      setNext(data.nextOffset || 0);
    } catch (e) {
      if (version === request.current && openRef.current) setError(e.message);
    } finally {
      if (version === request.current && openRef.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!open) return;
    setRows([]);
    setNext(0);
    setActive(0);
    setError("");
    if (categories) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => void load(), 180);
    return () => {
      clearTimeout(timer);
      request.current++;
    };
  }, [open, projectId, type, query, categories]);
  useEffect(() => {
    if (!open) return;
    function outside(event) {
      const target = event.composedPath?.()[0] || event.target;
      if (!root.current?.contains(target) && target !== editor.current)
        onClose();
    }
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      request.current++;
    };
  }, [open]);
  function choose(option) {
    if (!open) return;
    if (categories) {
      setType(option.type);
      setQuery("");
      setActive(0);
    } else onSelect(option);
  }
  function keyDown(event) {
    if (!open) return false;
    if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      if (onRestoreFocus) onRestoreFocus();
      else editor.current?.focus({ preventScroll: true });
      return true;
    }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const index =
        (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
        (options.length || 1);
      setActive(index);
      root.current
        ?.querySelectorAll('[role="option"]')
        [index]?.scrollIntoView({ block: "nearest" });
      return true;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      const option = event.target.closest?.('[role="option"]');
      if (
        !option &&
        event.target !== editor.current &&
        event.target.tagName !== "INPUT"
      )
        return false;
      event.preventDefault();
      const index = option
        ? [...root.current.querySelectorAll('[role="option"]')].indexOf(option)
        : active;
      if (options[index] && !loading) choose(options[index]);
      return true;
    }
    return false;
  }
  useImperativeHandle(ref, () => ({ keyDown }));
  useLayoutEffect(() => {
    const node = root.current;
    if (!open || !node) return undefined;
    const fit = () => {
      const container = node.parentElement;
      const containerRect = container.getBoundingClientRect();
      const editorRect = editor.current?.getBoundingClientRect();
      const caret = trigger?.end ?? editor.current?.selectionStart ?? 0;
      const measured = mentionAnchor(editor.current, caret);
      const anchor = measured || containerRect;
      const viewport = window.visualViewport;
      let top = (viewport?.offsetTop || 0) + 8,
        bottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - 8,
        left = (viewport?.offsetLeft || 0) + 8,
        right = (viewport?.offsetLeft || 0) + (viewport?.width || window.innerWidth) - 8;
      for (
        let parent = node.parentElement;
        parent;
        parent = parent.parentElement || parent.getRootNode()?.host
      ) {
        const style = getComputedStyle(parent);
        const clips = [style.overflowY, style.overflowX].some((value) =>
          ["auto", "scroll", "hidden", "clip"].includes(value),
        );
        if (!clips) continue;
        const clip = parent.getBoundingClientRect();
        top = Math.max(top, clip.top + 8);
        bottom = Math.min(bottom, clip.bottom - 8);
        left = Math.max(left, clip.left + 8);
        right = Math.min(right, clip.right - 8);
      }
      const above = anchor.top - top - 8, below = bottom - anchor.bottom - 8;
      // Keep the picker below the active line whenever it has enough room;
      // only use the upper side when the lower side cannot show a useful list.
      const minRoom = 160;
      const up = below < minRoom && above > below;
      let room = up ? above : below,
        y = up ? anchor.top - 8 : anchor.bottom + 8;
      // On short screens the picker overlays the editor rather than escaping
      // its scroll container or shrinking the results to an unusable sliver.
      if (room < minRoom) {
        const useAbove = above > below;
        room = Math.max(0, Math.max(above, below));
        y = useAbove ? bottom : top;
      }
      if (room < minRoom) {
        room = Math.max(0, bottom - top);
        y = above > below ? bottom : top;
      }
      const origin = containerRect;
      const width = editorRect?.width || containerRect.width;
      node.style.top = up ? "auto" : `${y - origin.top}px`;
      node.style.bottom = up ? `${origin.bottom - y}px` : "auto";
      node.style.left = `${Math.max(left, Math.min(editorRect?.left ?? origin.left, right - width)) - origin.left}px`;
      node.style.right = "auto";
      node.style.width = `${Math.max(0, Math.min(width, right - left))}px`;
      node.style.maxHeight = `${Math.max(0, Math.min(440, room))}px`;
      node.dataset.placement = up ? "above" : "below";
    };
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("scroll", fit, true);
    editor.current?.addEventListener("scroll", fit);
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("scroll", fit, true);
      editor.current?.removeEventListener("scroll", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
    };
  }, [open, presence.phase, options.length, categories, trigger?.end, query, editor]);
  if (!presence.mounted) return null;
  return (
    <div
      className="mention-picker"
      ref={root}
      role="dialog"
      aria-label={chatT("引用平台对象", "Tham chiếu đối tượng nền tảng")}
      aria-hidden={!open || undefined}
      inert={!open}
      data-phase={presence.phase}
      onKeyDown={keyDown}
    >
      <header>
        <HarnessIcon name="search" size={16} />
        <input
          aria-label={chatT("搜索引用对象", "Tìm đối tượng tham chiếu")}
          placeholder={
            type
              ? chatT(`搜索${referenceTypeLabel(type)}…`, `Tìm ${referenceTypeLabel(type)}…`)
              : chatT("搜索所有对象…", "Tìm mọi đối tượng…")
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" onClick={() => { onClose(); if (onRestoreFocus) onRestoreFocus(); else editor.current?.focus({ preventScroll: true }); }} className="mention-close">
          {chatT("关闭", "Đóng")}
        </button>
      </header>
      {onManageIssue && (type === "issue" || issueId) ? (
        <button
          type="button"
          className="mention-issue-context"
          disabled={!canManageIssue}
          onClick={onManageIssue}
          aria-haspopup="dialog"
        >
          <HarnessIcon name="doc" size={16} />
          <span>{chatT("会话主需求", "Yêu cầu chính của cuộc trò chuyện")}</span>
          <small>
            {issueId ? chatT(`已关联 · ${currentIssue?.name || issueId}`, `Đã liên kết · ${currentIssue?.name || issueId}`) : chatT("未关联", "Chưa liên kết")}
          </small>
          <HarnessIcon name="chevron-right" size={14} />
        </button>
      ) : null}
      <div role="listbox" aria-label={chatT("平台对象", "Đối tượng nền tảng")} className="mention-options">
        {options.map((option, index) => {
          const icon = icons[option.type] || "doc";
          return (
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              key={option.type + ":" + (option.id || option.type)}
              onPointerMove={() => setActive(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
            >
              <HarnessIcon name={icon} size={18} />
              <span>
                <strong>
                  {categories ? referenceTypeLabel(option.type) : option.name || option.id}
                </strong>
                <small>
                  {categories
                    ? referenceTypeHint(option.type)
                    : [
                        referenceTypeLabel(option.type),
                        option.projectName || chatT("共享", "Dùng chung"),
                        option.id,
                      ].join(" · ")}
                </small>
              </span>
              {categories ? (
                <HarnessIcon name="chevron-right" size={15} />
              ) : null}
            </button>
          );
        })}
        {loading ? (
          <p className="end-label" role="status">
            {chatT("正在查找…", "Đang tìm…")}
          </p>
        ) : null}
        {error ? (
          <p className="error" role="alert">
            {error}
            <button className="quiet-button" onClick={() => void load()}>
              {chatT("重试", "Thử lại")}
            </button>
          </p>
        ) : null}
        {!categories && !loading && !error && !rows.length ? (
          <p className="end-label">{chatT("没有匹配的对象", "Không có đối tượng phù hợp")}</p>
        ) : null}
        {next ? (
          <button
            className="quiet-button"
            disabled={loading}
            onClick={() => void load(next)}
          >
            {chatT("加载更多", "Tải thêm")}
          </button>
        ) : null}
      </div>
    </div>
  );
});
