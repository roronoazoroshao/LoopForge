import { chatT } from "./locale";
import React, { useCallback, useEffect, useRef, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import { api } from "./api";
import { devServerAddress, devServerLabel, devServerOrigin, devServerTarget, devServerURL } from "./agent-browser-links.js";
import { elementLabel, elementReference, inspectionReference } from "./element-context.js";
import "./agent-browser.css";

const modifiers = (e) =>
  (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0);
const keyText = { Enter: "\r", Tab: "\t" };
const buttonName = (b) => (b === 1 ? "middle" : b === 2 ? "right" : "left");
const deniedError = "无权操作";
const startingText = chatT("正在启动 Agent 浏览器…", "Đang khởi động trình duyệt tác tử…");

// AgentBrowser is the side panel's 浏览器 tab. Dev server addresses
// (http://localhost:PORT) and workspace files (file:///workspace/…) open
// natively: the platform serves them and the user's own browser renders the
// page. Everything else shows the Agent's
// browser on the execution machine as a live screencast.
// onAddElement, when given, lets the user pick an element of a native page
// and add it to the composer as context for the Agent.
export default function AgentBrowser({ runId, request = null, onRequestHandled = () => {}, onAddElement = null }) {
  // Decided before the first render, so a native page never starts a screencast.
  const [native, setNative] = useState(() => {
    const target = request?.url ? devServerTarget(request.url) : null;
    return target ? { ...target, key: request.id } : null;
  });
  const [forward, setForward] = useState(null);
  useEffect(() => {
    if (!request?.url) return;
    const target = devServerTarget(request.url);
    if (target) {
      setNative({ ...target, key: request.id });
      onRequestHandled(request.id);
      return;
    }
    setNative(null);
    setForward(request);
  }, [request?.id, request?.url]);
  const forwarded = useCallback(
    (id) => {
      setForward((current) => (current?.id === id ? null : current));
      onRequestHandled(id);
    },
    [onRequestHandled],
  );
  if (native)
    return (
      <DevServerFrame
        key={`${native.port}:${native.key}`}
        runId={runId}
        port={native.port}
        path={native.path}
        onOpen={(url) => {
          const target = devServerTarget(url);
          if (target) setNative({ ...target, key: `${Date.now()}` });
          else {
            setNative(null);
            setForward({ id: `${Date.now()}-${Math.random()}`, url });
          }
        }}
        onScreencast={() => setNative(null)}
        onAddElement={onAddElement}
      />
    );
  return (
    <ScreencastBrowser
      runId={runId}
      request={forward}
      onRequestHandled={forwarded}
      onNative={(target) => setNative({ ...target, key: `${Date.now()}` })}
      onAddElement={onAddElement}
    />
  );
}

// DevServerFrame renders a dev server or a file of the workspace in an iframe
// served by the platform under /devpreview/: native input, scrolling and
// devtools.
function DevServerFrame({ runId, port, path, onOpen, onScreencast, onAddElement = null }) {
  const frameRef = useRef(null);
  const addressRef = useRef(null);
  const [address, setAddress] = useState(`${devServerOrigin(port)}${path}`);
  const [src] = useState(() => devServerURL(runId, port, path));
  const [loading, setLoading] = useState(true);
  const [loads, setLoads] = useState(0);
  const pick = useElementPicker(frameRef, loads);
  const current = () => {
    try {
      return frameRef.current?.contentWindow?.location || null;
    } catch {
      return null;
    }
  };
  // Client-side routing changes the address without a load event.
  useEffect(() => {
    const timer = setInterval(() => {
      const location = current();
      if (!location || location.href === "about:blank" || document.activeElement === addressRef.current) return;
      setAddress(devServerAddress(runId, port, location));
    }, 800);
    return () => clearInterval(timer);
  }, [runId, port]);
  const history = (step) => {
    try {
      frameRef.current?.contentWindow?.history.go(step);
    } catch {
      /* cross-origin page: ignore */
    }
  };
  const reload = () => {
    setLoading(true);
    try {
      frameRef.current.contentWindow.location.reload();
    } catch {
      frameRef.current.src = src;
    }
  };
  const openWindow = () => {
    const location = current();
    const href = location && location.href !== "about:blank" ? location.href : src;
    window.open(href, "_blank", "noopener");
  };
  const button = (icon, label, onClick, extra = "") => (
    <button type="button" className={`agent-browser-btn${extra}`} title={label} aria-label={label} onClick={onClick}>
      <HarnessIcon name={icon} size={15} />
    </button>
  );
  return (
    <div className="agent-browser is-native">
      <div className="agent-browser-bar">
        {button("arrow-left", chatT("后退", "Quay lại"), () => history(-1))}
        {button("arrow-right", chatT("前进", "Tiến tới"), () => history(1))}
        {button("refresh", chatT("刷新", "Làm mới"), reload)}
        <form
          className="agent-browser-address"
          onSubmit={(event) => {
            event.preventDefault();
            const target = address.trim();
            if (!target) return;
            const next = devServerTarget(/^[a-z][a-z0-9+.-]*:/i.test(target) ? target : `http://${target}`);
            if (next && next.port === port) {
              setLoading(true);
              frameRef.current.src = devServerURL(runId, port, next.path);
              addressRef.current?.blur();
            } else onOpen(target);
          }}
        >
          <HarnessIcon name="globe" size={13} />
          <input
            ref={addressRef}
            type="text"
            spellCheck={false}
            aria-label={chatT("网址", "Địa chỉ web")}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          {onAddElement ? <AnnotateButton picking={pick.picking} onClick={pick.toggle} /> : null}
        </form>
        {button("preview-expand", chatT("在新窗口打开", "Mở trong cửa sổ mới"), openWindow)}
        {button("monitor", chatT("切换到 Agent 浏览器画面", "Chuyển sang màn hình trình duyệt tác tử"), onScreencast)}
      </div>
      <div className="agent-browser-stage agent-browser-native">
        <iframe
          ref={frameRef}
          className="agent-browser-frame"
          title={port === "file" ? chatT("工作区文件", "Tệp workspace") : chatT(`开发服务器 localhost:${port}`, `Máy chủ phát triển localhost:${port}`)}
          src={src}
          onLoad={() => {
            setLoading(false);
            setLoads((n) => n + 1);
            const location = current();
            if (location && document.activeElement !== addressRef.current)
              setAddress(devServerAddress(runId, port, location));
          }}
        />
        {loading ? (
          <div className="agent-browser-overlay agent-browser-loading" data-tone="idle">
            <span>{chatT(`正在打开 ${devServerLabel(port)}…`, `Đang mở ${devServerLabel(port)}…`)}</span>
          </div>
        ) : null}
        <ElementPickLayer
          pick={pick}
          frameRef={frameRef}
          onAdd={(el) => {
            const location = current();
            onAddElement?.(elementReference(el, location ? devServerAddress(runId, port, location) : address));
            pick.clear();
          }}
        />
      </div>
      <div className="agent-browser-foot">
        <span>{chatT("原生预览 ·", "Xem trước gốc ·")} {port === "file" ? chatT("工作区文件", "Tệp workspace") : chatT(`端口 ${port}`, `Cổng ${port}`)}</span>
        <small role="status">
          {port === "file"
            ? chatT("页面在你的浏览器里直接渲染；文件改动后点刷新", "Trang được kết xuất trực tiếp trong trình duyệt của bạn; nhấp làm mới sau khi tệp thay đổi")
            : chatT("页面在你的浏览器里直接渲染；暂不支持热更新，代码改动后点刷新", "Trang được kết xuất trực tiếp trong trình duyệt của bạn; chưa hỗ trợ cập nhật nóng, nhấp làm mới sau khi mã thay đổi")}
        </small>
      </div>
    </div>
  );
}

// useElementPicker drives element selection inside a same-origin preview
// frame: hovering outlines the element under the pointer, a click selects
// it without reaching the page. The page's own DOM is left alone apart from a
// temporary crosshair cursor; outlines are drawn above the frame.
function useElementPicker(frameRef, loads) {
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);
  const hovered = useRef(null);
  const frameDocument = () => {
    try {
      return frameRef.current?.contentDocument || null;
    } catch {
      return null;
    }
  };
  // Selection and outline follow the page while it scrolls or resizes.
  useEffect(() => {
    if (!picked && !picking) return undefined;
    const doc = frameDocument();
    const win = doc?.defaultView;
    if (!win) return undefined;
    const refresh = () => setTick((n) => n + 1);
    win.addEventListener("scroll", refresh, true);
    win.addEventListener("resize", refresh);
    return () => {
      win.removeEventListener("scroll", refresh, true);
      win.removeEventListener("resize", refresh);
    };
  }, [picked, picking, loads]);
  useEffect(() => {
    if (!picking) return undefined;
    const doc = frameDocument();
    if (!doc?.documentElement) {
      setError(chatT("当前页面不支持标记元素", "Trang hiện tại không hỗ trợ đánh dấu phần tử"));
      setPicking(false);
      return undefined;
    }
    setError("");
    const cursor = doc.createElement("style");
    cursor.setAttribute("data-af-pick", "");
    cursor.textContent = "*{cursor:crosshair!important}";
    (doc.head || doc.documentElement).appendChild(cursor);
    const target = (event) => {
      const el = event.target;
      return el && el.nodeType === 1 && el !== doc.documentElement ? el : null;
    };
    const move = (event) => {
      const el = target(event);
      if (el === hovered.current) return;
      hovered.current = el;
      setHover(el ? { el } : null);
    };
    const block = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };
    const click = (event) => {
      block(event);
      const el = target(event);
      if (!el) return;
      setPicked({ el });
      setPicking(false);
    };
    const key = (event) => {
      if (event.key !== "Escape") return;
      block(event);
      setPicking(false);
    };
    const leave = () => {
      hovered.current = null;
      setHover(null);
    };
    const blocked = ["mousedown", "mouseup", "pointerdown", "pointerup", "dblclick", "contextmenu", "auxclick"];
    doc.addEventListener("mousemove", move, true);
    doc.addEventListener("click", click, true);
    doc.addEventListener("keydown", key, true);
    doc.documentElement.addEventListener("mouseleave", leave);
    blocked.forEach((name) => doc.addEventListener(name, block, true));
    return () => {
      doc.removeEventListener("mousemove", move, true);
      doc.removeEventListener("click", click, true);
      doc.removeEventListener("keydown", key, true);
      doc.documentElement.removeEventListener("mouseleave", leave);
      blocked.forEach((name) => doc.removeEventListener(name, block, true));
      cursor.remove();
      hovered.current = null;
      setHover(null);
    };
  }, [picking, loads]);
  // A navigation replaces the document the selection belonged to.
  useEffect(() => setPicked(null), [loads]);
  useEffect(() => {
    if (!picking && !picked) return undefined;
    const key = (event) => {
      if (event.key !== "Escape") return;
      setPicking(false);
      setPicked(null);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [picking, picked]);
  return {
    picking,
    hover,
    picked: picked?.el?.isConnected ? picked : null,
    error,
    toggle: () => {
      setPicked(null);
      setPicking((on) => !on);
    },
    repick: () => {
      setPicked(null);
      setPicking(true);
    },
    clear: () => setPicked(null),
  };
}

const outlineOf = (el, frame) => {
  const rect = el.getBoundingClientRect();
  return {
    left: frame.offsetLeft + rect.left,
    top: frame.offsetTop + rect.top,
    width: rect.width,
    height: rect.height,
  };
};

// AnnotateButton sits at the end of the address bar and turns element
// marking on and off.
function AnnotateButton({ picking, disabled = false, onClick }) {
  return (
    <button
      type="button"
      className={`agent-browser-annotate${picking ? " is-on" : ""}`}
      title={picking ? chatT("退出标记（Esc）", "Thoát đánh dấu (Esc)") : chatT("在页面上标记元素，加入对话框", "Đánh dấu phần tử trên trang để đưa vào cuộc trò chuyện")}
      aria-pressed={picking}
      disabled={disabled}
      onClick={onClick}
    >
      <HarnessIcon name="crosshair" size={14} />
      <span>{chatT("标记元素", "Đánh dấu phần tử")}</span>
    </button>
  );
}

// ElementPickLayer outlines elements of the native preview frame.
function ElementPickLayer({ pick, frameRef, onAdd }) {
  const frame = frameRef.current;
  const stage = frame?.parentElement;
  if (!frame || !stage) return null;
  const hover = pick.picking && pick.hover?.el?.isConnected ? pick.hover.el : null;
  const picked = pick.picked?.el || null;
  const box = (el) => (el ? { ...outlineOf(el, frame), label: elementLabel(el) } : null);
  return (
    <PickOverlay
      stage={stage}
      hover={box(hover)}
      picked={box(picked)}
      picking={pick.picking}
      error={pick.error}
      onAdd={() => onAdd(picked)}
      onRepick={pick.repick}
      onCancel={pick.clear}
    />
  );
}

// PickOverlay draws the hover outline and, once an element is picked, a
// popover that adds it to the composer. Boxes are in stage pixels.
function PickOverlay({ stage, hover, picked, picking, error, busy = false, onAdd, onRepick, onCancel }) {
  if (!stage) return null;
  const box = (o, className) => (
    <div className={className} style={{ left: o.left, top: o.top, width: o.width, height: o.height }} aria-hidden="true">
      <span
        className={`agent-browser-pick-tag${o.top < 22 ? " is-inside" : ""}${
          o.left + 260 > stage.clientWidth ? " is-end" : ""
        }`}
      >
        <span className="agent-browser-pick-label">{o.label}</span>
        <span className="agent-browser-pick-size">
          {Math.round(o.width)}×{Math.round(o.height)}
        </span>
      </span>
    </div>
  );
  let popover = null;
  if (picked) {
    const width = Math.min(280, stage.clientWidth - 16);
    const below = picked.top + picked.height + 8;
    const top = below + 92 <= stage.clientHeight ? below : Math.max(8, picked.top - 92 - 8);
    const left = Math.max(8, Math.min(picked.left, stage.clientWidth - width - 8));
    popover = (
      <div className="agent-browser-pick-popover" role="dialog" aria-label={chatT("选中的元素", "Phần tử đã chọn")} style={{ top, left, width }}>
        <div className="agent-browser-pick-name">{picked.label}</div>
        <div className="agent-browser-pick-actions">
          <button type="button" className="agent-browser-pick-primary" disabled={busy} onClick={onAdd}>
            <HarnessIcon name="chat" size={14} />
            {busy ? chatT("读取中…", "Đang đọc…") : chatT("加入对话框", "Thêm vào cuộc trò chuyện")}
          </button>
          <button type="button" className="agent-browser-pick-secondary" onClick={onRepick}>
            {chatT("重新选择", "Chọn lại")}
          </button>
          <button type="button" className="agent-browser-pick-secondary" onClick={onCancel}>
            {chatT("取消", "Hủy")}
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      {hover ? box(hover, "agent-browser-pick-outline") : null}
      {picked ? box(picked, "agent-browser-pick-outline is-picked") : null}
      {popover}
      {picking ? (
        <div className="agent-browser-pick-hint" role="status">
          {chatT("点击要标记的元素，Esc 退出", "Nhấp phần tử cần đánh dấu, Esc để thoát")}
        </div>
      ) : null}
      {error ? (
        <div className="agent-browser-pick-hint" role="alert">
          {error}
        </div>
      ) : null}
    </>
  );
}

// useScreencastPicker selects elements on the Agent browser screencast. The
// page is inspected over CDP (operation "inspect"): hovering asks for the
// element under the pointer, one request at a time with only the latest point
// kept; a click asks again with the full description the composer sends.
function useScreencastPicker(runId, stageRef, screenRef) {
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState(null);
  const [picked, setPicked] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const inflight = useRef(false);
  const pending = useRef(null);

  const inspect = useCallback(
    async (point, detail) => {
      const state = await api(`/api/runs/${encodeURIComponent(runId)}/browser`, {
        method: "POST",
        body: JSON.stringify({ operation: "inspect", point, detail }),
      });
      return state?.inspect || null;
    },
    [runId],
  );
  // box maps an inspection (page CSS px) onto the stage.
  const box = useCallback(
    (found) => {
      const stage = stageRef.current, screen = screenRef.current;
      if (!found?.rect || !found.viewport?.width || !stage || !screen) return null;
      const s = stage.getBoundingClientRect(), img = screen.getBoundingClientRect();
      const scale = img.width / found.viewport.width;
      return {
        left: img.left - s.left + (found.rect.x || 0) * scale,
        top: img.top - s.top + (found.rect.y || 0) * scale,
        width: found.rect.width * scale,
        height: found.rect.height * scale,
        label: found.label || "",
      };
    },
    [stageRef, screenRef],
  );
  const pointOf = (e) => {
    const rect = screenRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
    return x < 0 || y < 0 || x > 1 || y > 1 ? null : { x, y };
  };
  const pump = useCallback(async () => {
    if (inflight.current || !pending.current) return;
    const { point, gen } = pending.current;
    pending.current = null;
    inflight.current = true;
    try {
      const found = await inspect(point, false);
      if (gen === generation.current) setHover(box(found));
    } catch (err) {
      if (gen === generation.current) setError(err.message || chatT("无法检查页面元素", "Không kiểm tra được phần tử trang"));
    } finally {
      inflight.current = false;
      pump();
    }
  }, [inspect, box]);

  const clear = useCallback(() => {
    generation.current += 1;
    pending.current = null;
    setPicking(false);
    setHover(null);
    setPicked(null);
    setInspection(null);
    setBusy(false);
    setError("");
  }, []);
  const repick = useCallback(() => {
    clear();
    setPicking(true);
  }, [clear]);
  const active = picking || !!picked;
  useEffect(() => {
    if (!active) return undefined;
    // Capture phase: Escape leaves picking before the screencast forwards it.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      clear();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, clear]);
  useEffect(() => clear, [runId, clear]);

  return {
    picking,
    active,
    hover,
    picked,
    inspection,
    busy,
    error,
    clear,
    repick,
    toggle: () => (picking ? clear() : repick()),
    // The page scrolled under an outline: drop it until the pointer moves.
    scrolled: () => {
      generation.current += 1;
      setHover(null);
    },
    leave: () => {
      generation.current += 1;
      pending.current = null;
      setHover(null);
    },
    move: (e) => {
      const point = pointOf(e);
      if (!point) return;
      setError("");
      pending.current = { point, gen: generation.current };
      pump();
    },
    select: async (e) => {
      const point = pointOf(e);
      if (!point) return;
      generation.current += 1;
      const gen = generation.current;
      pending.current = null;
      setPicking(false);
      setBusy(true);
      const s = stageRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      setPicked(hover ? { ...hover } : { left: e.clientX - s.left, top: e.clientY - s.top, width: 0, height: 0, label: "…" });
      try {
        const found = await inspect(point, true);
        if (gen !== generation.current) return;
        if (!found?.element) {
          setPicked(null);
          setPicking(true);
          setError(chatT("这个位置没有可选的元素", "Không có phần tử có thể chọn ở vị trí này"));
        } else {
          setInspection(found);
          setPicked(box(found));
        }
      } catch (err) {
        if (gen !== generation.current) return;
        setPicked(null);
        setPicking(true);
        setError(err.message || chatT("无法检查页面元素", "Không kiểm tra được phần tử trang"));
      } finally {
        if (gen === generation.current) setBusy(false);
      }
    },
  };
}

// ScreencastBrowser shows the Agent browser of the conversation's workspace:
// the browser Main Bot drives with workbench_browser_*, running on the
// execution machine next to the workspace. The user watches it live and can
// take over. Protocol and input handling follow the task panel in
// web/collaboration.js: one WebSocket carries frames and input, plain polling
// is the fallback.
function ScreencastBrowser({
  runId,
  request = null,
  onRequestHandled = () => {},
  onNative = () => {},
  onAddElement = null,
}) {
  const stageRef = useRef(null);
  const screenRef = useRef(null);
  const imeRef = useRef(null);
  const addressRef = useRef(null);
  const controller = useRef(null);
  const [page, setPage] = useState({ available: false, canGoBack: false, canGoForward: false, tabs: [] });
  const [overlay, setOverlay] = useState({ text: chatT("正在连接 Agent 浏览器…", "Đang kết nối trình duyệt tác tử…"), tone: "idle" });
  const [status, setStatus] = useState(chatT("连接中", "Đang kết nối"));
  const [notice, setNotice] = useState("");
  const [address, setAddress] = useState("");
  const [denied, setDenied] = useState(false);
  const pick = useScreencastPicker(runId, stageRef, screenRef);
  const picking = useRef(false);
  picking.current = pick.active;

  useEffect(() => {
    if (!runId) return undefined;
    const stage = stageRef.current;
    const screen = screenRef.current;
    const ime = imeRef.current;
    const endpoint = `/api/runs/${encodeURIComponent(runId)}/browser`;
    const call = (body) => api(endpoint, { method: "POST", body: JSON.stringify(body) });
    let alive = true;
    let seq = 0, state = null, queue = [], sending = false, lastInput = 0;
    let moveTimer = 0, pendingMove = null, ws = null, wsFails = 0, frameURL = "";
    let starting = 0, ready = false, readOnly = false, polling = false;
    let pendingNavigate = "", noticeTimer = 0, reconnectTimer = 0, sizeTimer = 0, sentSize = "";
    // A hidden page stops streaming; the browser keeps running on the executor.
    const live = () => alive && !document.hidden;

    function notify(message) {
      if (!alive || !message) return;
      if (message.includes(deniedError)) {
        // Viewers of the project see the browser but cannot drive it.
        readOnly = true;
        queue = [];
        pendingNavigate = "";
        setDenied(true);
        if (state) paint(state);
        return;
      }
      setNotice(message);
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => alive && setNotice(""), 6000);
    }
    function paint(next) {
      if (!alive || !next) return;
      state = next;
      if (!next.available) {
        if (starting && Date.now() - starting < 240000) setOverlay({ text: startingText, tone: "idle" });
        else {
          starting = 0;
          setOverlay({ text: next.reason || chatT("Agent 浏览器尚未启动", "Trình duyệt tác tử chưa khởi động"), tone: "idle", start: !readOnly });
        }
        setStatus(chatT("未连接", "Chưa kết nối"));
        setPage((p) => ({ ...p, available: false }));
        return;
      }
      starting = 0;
      if (!ready) {
        ready = true;
        fit();
      }
      if (next.frame) {
        screen.src = `data:image/jpeg;base64,${next.frame}`;
        seq = next.seq;
      }
      setOverlay(screen.getAttribute("src") ? null : { text: chatT("正在等待第一帧画面…", "Đang chờ khung hình đầu tiên…"), tone: "idle" });
      if (document.activeElement !== addressRef.current)
        setAddress(next.url && next.url !== "about:blank" ? next.url : "");
      setPage({
        available: true,
        canGoBack: !!next.canGoBack,
        canGoForward: !!next.canGoForward,
        tabs: next.tabs || [],
      });
      setStatus(
        `${next.kind === "docker" ? chatT("沙箱浏览器", "Trình duyệt sandbox") : chatT("本机 Chromium", "Chromium cục bộ")}${Date.now() - lastInput < 4000 ? chatT(" · 你正在操作", " · Bạn đang thao tác") : chatT(" · 实时", " · Trực tiếp")}`,
      );
      if (pendingNavigate) {
        const url = pendingNavigate;
        pendingNavigate = "";
        command({ operation: "navigate", url });
      }
    }
    function send(body) {
      if (ws?.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify(body));
      return true;
    }
    async function command(body) {
      if (readOnly) return;
      if (send(body)) return;
      try {
        paint(await call({ ...body, after: seq }));
      } catch (err) {
        notify(err.message);
      }
    }
    // Starting can take minutes when the workspace has to be restored first.
    async function startBrowser(body = { operation: "start" }) {
      if (readOnly || starting) return;
      starting = Date.now();
      setOverlay({ text: startingText, tone: "idle" });
      if (send({ ...body, ensure: true })) return;
      try {
        const next = await call({ ...body, ensure: true, after: seq });
        starting = 0;
        paint(next);
        if (!next.available) notify(next.reason || chatT("Agent 浏览器未能启动", "Không khởi động được trình duyệt tác tử"));
      } catch (err) {
        starting = 0;
        notify(err.message);
        if (state) paint(state);
        else if (alive) setOverlay({ text: err.message, tone: "error", start: !readOnly });
      }
    }
    function navigate(url) {
      if (readOnly) {
        notify(deniedError);
        return;
      }
      if (state?.available) command({ operation: "navigate", url });
      else if (starting) pendingNavigate = url;
      else startBrowser({ operation: "navigate", url });
      stage.focus({ preventScroll: true });
    }

    // Frames that arrive while one is decoding are dropped; only the newest is shown next.
    let nextFrame = null, decoding = false;
    function showFrame(blob) {
      nextFrame = blob;
      if (!decoding) drawFrame();
    }
    function drawFrame() {
      const blob = nextFrame;
      nextFrame = null;
      decoding = !!blob && alive;
      if (!decoding) return;
      const url = URL.createObjectURL(blob);
      screen.onload = screen.onerror = () => {
        if (frameURL && frameURL !== url) URL.revokeObjectURL(frameURL);
        frameURL = url;
        if (alive && state?.available) setOverlay(null);
        drawFrame();
      };
      screen.src = url;
    }
    function connect() {
      if (!live() || ws) return;
      let opened = false;
      const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${endpoint}/stream`,
      );
      socket.binaryType = "blob";
      ws = socket;
      socket.onopen = () => {
        opened = true;
        wsFails = 0;
        sentSize = "";
        fit();
      };
      socket.onmessage = (e) => {
        if (!live()) {
          socket.close();
          return;
        }
        if (typeof e.data !== "string") {
          showFrame(e.data);
          return;
        }
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type === "state" && msg.state) paint(msg.state);
        else if (msg.type === "error") {
          notify(msg.error);
          if (starting) {
            starting = 0;
            if (state) paint(state);
          }
        }
      };
      socket.onclose = () => {
        if (ws === socket) ws = null;
        if (!live()) return;
        if (!opened && ++wsFails >= 2) {
          loop();
          return;
        }
        reconnectTimer = setTimeout(connect, opened ? 1000 : 2000);
      };
    }
    async function loop() {
      if (polling) return;
      polling = true;
      let delay = 0;
      try {
        while (live()) {
          if (delay) await new Promise((r) => setTimeout(r, delay));
          if (!live()) return;
          try {
            const next = await call({ operation: state ? "frame" : "status", after: seq, waitMs: 3000 });
            if (!live()) return;
            paint(next);
            delay = next.available ? 0 : 4000;
          } catch (err) {
            if (!live()) return;
            setOverlay({ text: err.message, tone: "error" });
            delay = 4000;
          }
        }
      } finally {
        polling = false;
      }
    }
    const resume = () => {
      if (document.hidden) {
        ws?.close();
        return;
      }
      if (typeof WebSocket !== "function" || wsFails >= 2) loop();
      else connect();
    };

    function flush() {
      if (readOnly) {
        queue = [];
        return;
      }
      if (sending || !queue.length || !alive) return;
      lastInput = Date.now();
      if (send({ operation: "input", events: queue })) {
        queue = [];
        return;
      }
      const events = queue;
      queue = [];
      sending = true;
      call({ operation: "input", events, after: seq })
        .then(paint, (err) => notify(err.message))
        .finally(() => {
          sending = false;
          flush();
        });
    }
    function push(ev) {
      if (readOnly) return;
      queue.push(ev);
      flush();
    }
    // Scrolls are not previewed by sliding the current frame: that moved the
    // page's fixed parts and scrollbar with it and bared the stage below. The
    // stream delivers the scrolled frame in well under 100ms instead.
    let wheel = null, wheelTimer = 0;
    function point(e) {
      const rect = screen.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / (rect.width || 1),
        y: (e.clientY - rect.top) / (rect.height || 1),
      };
    }
    function flushWheel() {
      wheelTimer = 0;
      if (!wheel) return;
      const ev = wheel;
      wheel = null;
      push(ev);
    }
    const mouse = (e, action) => ({
      type: "mouse",
      action,
      ...point(e),
      button: buttonName(e.button),
      buttons: e.buttons,
      clickCount: e.detail || 1,
      modifiers: modifiers(e),
    });
    // While picking, the capture layer owns the pointer: nothing reaches the page.
    const onScreen = (e) => !picking.current && (e.target === screen || e.target === stage);
    const onPointerDown = (e) => {
      if (!state?.available || !onScreen(e)) return;
      e.preventDefault();
      stage.setPointerCapture?.(e.pointerId);
      ime.focus({ preventScroll: true });
      claim();
      push(mouse(e, "down"));
    };
    const onPointerUp = (e) => {
      if (state?.available && onScreen(e)) push(mouse(e, "up"));
    };
    const onPointerMove = (e) => {
      if (!state?.available || readOnly || !onScreen(e)) return;
      pendingMove = {
        type: "mouse",
        action: "move",
        ...point(e),
        button: e.buttons & 1 ? "left" : "none",
        buttons: e.buttons,
        modifiers: modifiers(e),
      };
      if (moveTimer) return;
      moveTimer = setTimeout(() => {
        moveTimer = 0;
        if (pendingMove) {
          push(pendingMove);
          pendingMove = null;
        }
      }, 60);
    };
    const onWheel = (e) => {
      if (!state?.available || readOnly) return;
      pick.scrolled();
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? state.height || 600 : 1;
      wheel = {
        type: "wheel",
        ...point(e),
        deltaX: (wheel?.deltaX || 0) + e.deltaX * unit,
        deltaY: (wheel?.deltaY || 0) + e.deltaY * unit,
        modifiers: modifiers(e),
      };
      claim();
      if (!wheelTimer) wheelTimer = setTimeout(flushWheel, 40);
    };
    const onContextMenu = (e) => e.preventDefault();
    const onStageFocus = () => ime.focus({ preventScroll: true });
    const onKeyDown = (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (picking.current && e.key === "Escape") return;
      if ((e.metaKey || e.ctrlKey) && ["v", "c", "x"].includes(e.key.toLowerCase())) return;
      // Handled here so Escape or Tab reach the page instead of closing the panel.
      e.preventDefault();
      const text = keyText[e.key] || (e.key.length === 1 && !e.ctrlKey && !e.metaKey ? e.key : "");
      push({ type: "key", action: "down", key: e.key, code: e.code, keyCode: e.keyCode, text, modifiers: modifiers(e) });
    };
    const onKeyUp = (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      push({ type: "key", action: "up", key: e.key, code: e.code, keyCode: e.keyCode, modifiers: modifiers(e) });
    };
    const onCompositionStart = () => {
      ime.dataset.composing = "1";
    };
    const onCompositionEnd = (e) => {
      delete ime.dataset.composing;
      if (e.data) push({ type: "text", text: e.data });
      ime.value = "";
    };
    const onPaste = (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain");
      if (text) push({ type: "text", text });
    };
    const onInput = (e) => {
      if (ime.dataset.composing || e.isComposing || e.inputType === "insertCompositionText") return;
      if (ime.value) push({ type: "text", text: ime.value });
      ime.value = "";
    };
    // wantedSize is the Agent browser viewport that fills this panel.
    function wantedSize() {
      const rect = stage.getBoundingClientRect();
      if (!state?.available || rect.width < 120 || rect.height < 120) return null;
      const width = Math.round(Math.min(1600, Math.max(1024, rect.width)));
      const height = Math.round(Math.min(2000, Math.max(500, (width * rect.height) / rect.width)));
      // Frames carry up to the panel's device pixels: the Agent browser
      // renders at 2x, so a high-DPI panel is not shown upscaled frames.
      const frameWidth = Math.round(rect.width * Math.min(window.devicePixelRatio || 1, 2));
      return { width, height, frameWidth };
    }
    function sendSize(force = false) {
      if (!alive || readOnly) return;
      const size = wantedSize();
      if (!size) return;
      const key = `${size.width}x${size.height}@${size.frameWidth}`;
      if (key === sentSize && !force) return;
      sentSize = key;
      command({ operation: "resize", ...size });
    }
    function fit() {
      clearTimeout(sizeTimer);
      sizeTimer = setTimeout(sendSize, 400);
    }
    // Every panel watching the run shares one Agent browser, and the last one
    // to resize it wins. The panel being used takes the size back when it no
    // longer fits, but only on input, so two open panels never take turns.
    let claimedAt = 0;
    function claim() {
      const size = wantedSize();
      if (!size || readOnly || Date.now() - claimedAt < 1000) return;
      // Frames report the viewport with the page's scrollbar (about 15px)
      // while resize sets it without, so only a clearly different size counts.
      const off = (a, b) => !(a > 0) || Math.abs(a - b) > 24;
      if (!off(state.width, size.width) && !off(state.height, size.height)) return;
      claimedAt = Date.now();
      sendSize(true);
    }

    const listeners = [
      [stage, "pointerdown", onPointerDown],
      [stage, "pointerup", onPointerUp],
      [stage, "pointermove", onPointerMove],
      [stage, "wheel", onWheel, { passive: false }],
      [stage, "contextmenu", onContextMenu],
      [stage, "focus", onStageFocus],
      [ime, "keydown", onKeyDown],
      [ime, "keyup", onKeyUp],
      [ime, "compositionstart", onCompositionStart],
      [ime, "compositionend", onCompositionEnd],
      [ime, "paste", onPaste],
      [ime, "input", onInput],
      [document, "visibilitychange", resume],
    ];
    for (const [target, type, fn, options] of listeners) target.addEventListener(type, fn, options);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    observer?.observe(stage);
    controller.current = { command, navigate, start: () => startBrowser() };
    if (typeof WebSocket === "function") connect();
    else loop();
    return () => {
      alive = false;
      controller.current = null;
      for (const [target, type, fn, options] of listeners) target.removeEventListener(type, fn, options);
      observer?.disconnect();
      for (const timer of [noticeTimer, reconnectTimer, sizeTimer, moveTimer, wheelTimer]) clearTimeout(timer);
      screen.onload = screen.onerror = null;
      ws?.close();
      ws = null;
      if (frameURL) URL.revokeObjectURL(frameURL);
    };
  }, [runId]);

  // A link the user clicked in the conversation. App clears the request once
  // handled, so reopening the tab does not navigate again.
  useEffect(() => {
    if (!request?.url || !controller.current) return;
    controller.current.navigate(request.url);
    onRequestHandled(request.id);
  }, [request?.id, request?.url, runId]);

  const disabled = !page.available || denied;
  const navButton = (icon, label, operation, off = disabled) => (
    <button
      type="button"
      className="agent-browser-btn"
      title={label}
      aria-label={label}
      disabled={off}
      onClick={() => controller.current?.command({ operation })}
    >
      <HarnessIcon name={icon} size={15} />
    </button>
  );
  return (
    <div className="agent-browser">
      <div className="agent-browser-bar">
        {navButton("arrow-left", chatT("后退", "Quay lại"), "back", disabled || !page.canGoBack)}
        {navButton("arrow-right", chatT("前进", "Tiến tới"), "forward", disabled || !page.canGoForward)}
        {navButton("refresh", chatT("刷新", "Làm mới"), "reload")}
        <form
          className="agent-browser-address"
          onSubmit={(event) => {
            event.preventDefault();
            const target = address.trim();
            if (target) controller.current?.navigate(target);
          }}
        >
          <HarnessIcon name="globe" size={13} />
          <input
            ref={addressRef}
            type="text"
            spellCheck={false}
            placeholder={chatT("输入网址或搜索内容", "Nhập địa chỉ web hoặc nội dung tìm kiếm")}
            aria-label={chatT("网址", "Địa chỉ web")}
            value={address}
            readOnly={denied}
            onChange={(event) => setAddress(event.target.value)}
          />
          {onAddElement && !denied ? (
            <AnnotateButton picking={pick.picking} disabled={!page.available} onClick={pick.toggle} />
          ) : null}
        </form>
        {navButton("plus", chatT("新标签页", "Tab mới"), "newTab")}
        {devServerTarget(address) ? (
          <button
            type="button"
            className="agent-browser-btn"
            title={chatT("在原生预览中打开（你的浏览器直接渲染，操作更流畅）", "Mở trong xem trước gốc (trình duyệt của bạn kết xuất trực tiếp, thao tác mượt hơn)")}
            aria-label={chatT("在原生预览中打开", "Mở trong xem trước gốc")}
            onClick={() => onNative(devServerTarget(address))}
          >
            <HarnessIcon name="preview-expand" size={15} />
          </button>
        ) : null}
      </div>
      {page.tabs.length > 1 ? (
        <div className="agent-browser-tabs" role="tablist" aria-label={chatT("浏览器标签页", "Tab trình duyệt")}>
          {page.tabs.map((tab) => (
            <div
              key={tab.id}
              className={`agent-browser-tab${tab.active ? " is-active" : ""}`}
              role="tab"
              aria-selected={!!tab.active}
              title={tab.url || ""}
            >
              <button
                type="button"
                disabled={denied}
                onClick={() => controller.current?.command({ operation: "activate", targetId: tab.id })}
              >
                {tab.title || tab.url || chatT("新标签页", "Tab mới")}
              </button>
              <button
                type="button"
                className="agent-browser-tab-close"
                title={chatT("关闭标签页", "Đóng tab")}
                aria-label={chatT("关闭标签页", "Đóng tab")}
                disabled={denied}
                onClick={() => controller.current?.command({ operation: "closeTab", targetId: tab.id })}
              >
                <HarnessIcon name="close" size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div
        ref={stageRef}
        className={`agent-browser-stage${page.available ? "" : " is-offline"}`}
        tabIndex={0}
        aria-label={denied ? chatT("Agent 浏览器画面（只读）", "Màn hình trình duyệt tác tử (chỉ đọc)") : chatT("Agent 浏览器画面，点击后可直接操作", "Màn hình trình duyệt tác tử, nhấp để trực tiếp thao tác")}
      >
        <img ref={screenRef} className="agent-browser-screen" alt="" draggable={false} />
        <textarea
          ref={imeRef}
          className="agent-browser-ime"
          aria-hidden="true"
          tabIndex={-1}
          autoCapitalize="off"
          spellCheck={false}
        />
        {overlay ? (
          <div className="agent-browser-overlay" data-tone={overlay.tone}>
            <span>{overlay.text}</span>
            {overlay.start && !denied ? (
              <button type="button" className="agent-browser-start" onClick={() => controller.current?.start()}>
                <HarnessIcon name="globe" size={14} />
                {chatT("启动浏览器", "Khởi động trình duyệt")}
              </button>
            ) : null}
          </div>
        ) : null}
        {pick.picking ? (
          <div
            className="agent-browser-pick-capture"
            data-testid="agent-browser-pick-capture"
            onPointerMove={pick.move}
            onPointerLeave={pick.leave}
            onPointerDown={(e) => e.preventDefault()}
            onClick={pick.select}
          />
        ) : null}
        {pick.active ? (
          <PickOverlay
            stage={stageRef.current}
            hover={pick.picking ? pick.hover : null}
            picked={pick.picked}
            picking={pick.picking}
            error={pick.error}
            busy={pick.busy}
            onAdd={() => {
              if (pick.inspection?.element) onAddElement?.(inspectionReference(pick.inspection));
              pick.clear();
            }}
            onRepick={pick.repick}
            onCancel={pick.clear}
          />
        ) : null}
      </div>
      <div className="agent-browser-foot">
        <span>{status}</span>
        <small role="status" data-tone={notice ? "error" : undefined}>
          {notice ||
            (denied
              ? chatT("你没有该项目的编辑权限，只能查看画面", "Bạn không có quyền sửa dự án này, chỉ có thể xem màn hình")
              : chatT("与 Agent 用的是同一个浏览器，点击画面即可接管操作", "Dùng cùng trình duyệt với tác tử, nhấp màn hình để tiếp quản thao tác"))}
        </small>
      </div>
    </div>
  );
}
