import { chatT } from "./locale";
import React, { useEffect, useRef, useState } from "react";
import { api, sessionPath } from "./api.js";
import HarnessIcon from "./HarnessIcon";
import { CredentialAction } from "./ui";
import { CLIInstallAction } from "./cli-install.jsx";
import "./generation-diagnostics.css";

const phases = {
  setup: chatT("启动与配置", "Khởi động và cấu hình"),
  execution: chatT("CLI 执行", "Thực thi CLI"),
  protocol: chatT("结果解析", "Phân tích kết quả"),
  provider: chatT("模型服务", "Dịch vụ mô hình"),
  connection: chatT("连接模型服务", "Kết nối dịch vụ mô hình"),
  server: chatT("平台服务", "Dịch vụ nền tảng"),
  orchestration: chatT("对话处理", "Xử lý cuộc trò chuyện"),
};
const statuses = {
  running: chatT("执行中", "Đang thực thi"),
  completed: chatT("已完成", "Đã hoàn tất"),
  failed: chatT("失败", "Thất bại"),
  cancelled: chatT("已停止", "Đã dừng"),
  interrupted: chatT("已中断", "Đã gián đoạn"),
  unfinished: chatT("未完成", "Chưa hoàn tất"),
};
const processStates = {
  not_started: chatT("未启动", "Chưa khởi chạy"),
  running: chatT("运行中", "Đang chạy"),
  start_failed: chatT("启动失败", "Khởi chạy thất bại"),
  exited: chatT("已退出", "Đã thoát"),
  unknown_after_interruption: chatT("中断后未知", "Không rõ sau gián đoạn"),
};
const toolSources = {
  gateway: chatT("平台网关", "Gateway nền tảng"),
  cli: chatT("CLI 协议", "Giao thức CLI"),
};
const time = (value) =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";

async function copyText(text) {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(text);
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  try {
    input.select();
    if (!document.execCommand("copy"))
      throw new Error(chatT("请手动选择诊断内容复制", "Vui lòng chọn nội dung chẩn đoán để sao chép thủ công"));
  } finally {
    input.remove();
  }
}

export default function GenerationDiagnostics({
  sessionId,
  generationId,
  failure,
  onCLIInstall,
  compact = false,
  readOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const identity = `${sessionId}/${generationId}`;
  const current = useRef(identity);
  current.current = identity;
  useEffect(() => {
    setOpen(false);
    setReport(null);
    setNotice("");
    setError("");
    setLoading(false);
  }, [identity]);
  // Read-only viewers (shared conversation links) cannot read the report, so
  // they only see the fixed failure summary without detail actions.
  if (!sessionId || !generationId || (readOnly && compact)) return null;
  const path = `${sessionPath(sessionId)}/generations/${encodeURIComponent(generationId)}/diagnostics`;

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await api(path);
      if (current.current !== identity) return null;
      setReport(data);
      return data;
    } catch (e) {
      if (current.current === identity)
        setError(e.message || chatT("读取诊断信息失败，请重试", "Không đọc được thông tin chẩn đoán, hãy thử lại"));
      return null;
    } finally {
      if (current.current === identity) setLoading(false);
    }
  }
  async function toggle() {
    setOpen(!open);
    if (!open) await load();
  }
  async function copy() {
    const data = await load();
    if (!data) return;
    try {
      await copyText(JSON.stringify(data, null, 2));
      if (current.current === identity) setNotice(chatT("已复制诊断信息", "Đã sao chép thông tin chẩn đoán"));
    } catch {
      if (current.current === identity)
        setError(chatT("复制失败，请下载诊断文件或手动复制详情", "Sao chép thất bại, hãy tải tệp chẩn đoán hoặc sao chép chi tiết thủ công"));
    }
  }
  const shown = failure || report?.failure;
  return (
    <section
      className={`generation-diagnostics${compact ? " compact" : " failure"}`}
      aria-label={failure ? chatT("本轮失败诊断", "Chẩn đoán thất bại lượt này") : chatT("本轮诊断信息", "Thông tin chẩn đoán lượt này")}
    >
      {!compact && shown ? (
        <>
          <div className="diagnostic-heading">
            <HarnessIcon name="warning" size={17} aria-hidden="true" />
            <strong>{shown.message}</strong>
            <code>{shown.code}</code>
          </div>
          {shown.suggestion ? (
            <p className="diagnostic-suggestion">{shown.suggestion}</p>
          ) : null}
          <CredentialAction text={shown.message} />
          <CLIInstallAction text={shown.message} onResult={onCLIInstall} />
        </>
      ) : null}
      {readOnly ? null : (
        <div className="diagnostic-actions">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            disabled={loading}
          >
            <HarnessIcon
              name={open ? "chevron-down" : "chevron-right"}
              size={14}
              aria-hidden="true"
            />
            {compact ? chatT("诊断信息", "Thông tin chẩn đoán") : chatT("查看详情", "Xem chi tiết")}
          </button>
          {!compact || open ? (
            <>
              <button type="button" onClick={copy} disabled={loading}>
                <HarnessIcon name="copy" size={14} aria-hidden="true" />
                {chatT("复制诊断", "Sao chép chẩn đoán")}
              </button>
              <a href={`${path}?download=1`} download>
                <HarnessIcon name="download" size={14} aria-hidden="true" />
                {chatT("下载诊断", "Tải chẩn đoán")}
              </a>
            </>
          ) : null}
          {loading ? (
            <span role="status">{chatT("读取中…", "Đang đọc…")}</span>
          ) : notice ? (
            <span role="status">{notice}</span>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="diagnostic-fetch-error" role="alert">
          {error}
        </p>
      ) : null}
      {open && report ? (
        <div className="diagnostic-details">
          {report.assessment ? (
            <div className="diagnostic-assessment">
              <strong>{report.assessment.summary}</strong>
              {report.assessment.evidence?.length ? (
                <ul className="diagnostic-list">
                  {report.assessment.evidence.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {report.assessment.unknowns?.length ? (
                <p className="diagnostic-subnote">
                  {chatT("边界说明：", "Giới hạn: ")}{report.assessment.unknowns.join(" ")}
                </p>
              ) : null}
              {report.assessment.nextSteps?.length ? (
                <p className="diagnostic-subnote">
                  {chatT("排查建议：", "Gợi ý xử lý: ")}{report.assessment.nextSteps.join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}
          <dl className="diagnostic-meta">
            <dt>{chatT("诊断编号", "ID chẩn đoán")}</dt>
            <dd>
              <code>{report.generationId}</code>
            </dd>
            <dt>{chatT("状态", "Trạng thái")}</dt>
            <dd>{statuses[report.status] || report.status}</dd>
            <dt>{chatT("开始时间", "Thời gian bắt đầu")}</dt>
            <dd>{time(report.startedAt)}</dd>
            {report.termination ? (
              <>
                <dt>{chatT("结束原因", "Lý do kết thúc")}</dt>
                <dd>
                  <code>{report.termination.code}</code> ·{" "}
                  {report.termination.message}
                </dd>
              </>
            ) : null}
            {shown?.phase ? (
              <>
                <dt>{chatT("失败阶段", "Giai đoạn thất bại")}</dt>
                <dd>{phases[shown.phase] || shown.phase}</dd>
              </>
            ) : null}
            {report.environment ? (
              <>
                <dt>{chatT("运行实例", "Instance thực thi")}</dt>
                <dd>
                  <code>{report.environment.instanceId}</code> ·{" "}
                  {report.environment.platformVersion}
                  {report.environment.revision
                    ? ` (${report.environment.revision.slice(0, 8)})`
                    : ""}{" "}
                  · {report.environment.os}/{report.environment.arch}
                </dd>
              </>
            ) : null}
          </dl>
          {(report.attempts || []).map((attempt, index) => {
            const proc = attempt.process;
            const lastOut = proc?.lastStdoutAt || proc?.lastStderrAt;
            return (
              <div className="diagnostic-attempt" key={attempt.id}>
                <div className="diagnostic-attempt-heading">
                  <strong>
                    {chatT("调用", "Lần gọi")} {attempt.id?.split("/").at(-1) || index + 1} ·{" "}
                    {attempt.engine}
                    {attempt.cliVersion ? ` v${attempt.cliVersion.replace(/^v/i, "")}` : ""}
                  </strong>
                  <span>{attempt.model}</span>
                  <span>{statuses[attempt.status] || attempt.status}</span>
                  {attempt.exitCode != null ? (
                    <code>{chatT("退出码", "Mã thoát")} {attempt.exitCode}</code>
                  ) : null}
                </div>
                <p className="diagnostic-attempt-meta">
                  {attempt.resume ? chatT("恢复会话", "Khôi phục cuộc trò chuyện") : chatT("新会话", "Cuộc trò chuyện mới")} ·{" "}
                  {phases[attempt.phase] || attempt.phase} ·{" "}
                  {time(attempt.startedAt)}
                  {attempt.endpoint ? ` · ${attempt.endpoint}` : ""}
                  {attempt.protocol ? ` (${attempt.protocol})` : ""}
                </p>
                {proc ? (
                  <p className="diagnostic-attempt-meta">
                    {chatT("进程：", "Tiến trình: ")}{processStates[proc.state] || proc.state}
                    {proc.pid ? ` · PID ${proc.pid}` : ""}
                    {proc.signal ? chatT(` · 信号 ${proc.signal}`, ` · Tín hiệu ${proc.signal}`) : ""}
                    {chatT(` · 输出 ${proc.stdoutLines || 0}/${proc.stderrLines || 0} 行`, ` · Đầu ra ${proc.stdoutLines || 0}/${proc.stderrLines || 0} dòng`)}
                    {lastOut ? chatT(` · 最近输出 ${time(lastOut)}`, ` · Đầu ra gần nhất ${time(lastOut)}`) : ""}
                  </p>
                ) : null}
                {attempt.firstError && report.dropped?.protocolEvents > 0 ? (
                  <div className="diagnostic-event">
                    <div>
                      <strong>{chatT("首次异常", "Bất thường đầu tiên")}</strong>
                      <code>{attempt.firstError.kind}</code>
                      {attempt.firstError.statusCode ? (
                        <span>HTTP {attempt.firstError.statusCode}</span>
                      ) : null}
                    </div>
                    {attempt.firstError.message ? (
                      <pre>{attempt.firstError.message}</pre>
                    ) : null}
                  </div>
                ) : null}
                {attempt.error ? (
                  <pre className="diagnostic-excerpt">{attempt.error}</pre>
                ) : null}
                {(attempt.events || []).map((event, i) => (
                  <div className="diagnostic-event" key={i}>
                    <div>
                      <code>{event.kind}</code>
                      {event.statusCode ? (
                        <span>HTTP {event.statusCode}</span>
                      ) : null}
                      {event.code ? <code>{event.code}</code> : null}
                      {event.retryable != null ? (
                        <span>{event.retryable ? chatT("可重试", "Có thể thử lại") : chatT("不可重试", "Không thể thử lại")}</span>
                      ) : null}
                    </div>
                    {event.message ? <pre>{event.message}</pre> : null}
                    {event.requestId ? (
                      <p>
                        Request ID <code>{event.requestId}</code>
                      </p>
                    ) : null}
                    {event.traceId ? (
                      <p>
                        Trace ID <code>{event.traceId}</code>
                      </p>
                    ) : null}
                  </div>
                ))}
                {attempt.firstStderr?.length &&
                report.dropped?.stderrLines > 0 ? (
                  <details className="diagnostic-stderr">
                    <summary>
                      {chatT(`CLI 起始输出 · 前 ${attempt.firstStderr.length} 行`, `Đầu ra CLI ban đầu · ${attempt.firstStderr.length} dòng đầu`)}
                    </summary>
                    <pre>{attempt.firstStderr.join("\n")}</pre>
                  </details>
                ) : null}
                {attempt.stderr?.length ? (
                  <details className="diagnostic-stderr">
                    <summary>
                      {chatT(`CLI 错误输出 · 最近 ${attempt.stderr.length} 行`, `Đầu ra lỗi CLI · ${attempt.stderr.length} dòng gần nhất`)}
                    </summary>
                    <pre>{attempt.stderr.join("\n")}</pre>
                  </details>
                ) : null}
              </div>
            );
          })}
          {report.tools?.length ? (
            <details
              className="diagnostic-stderr"
              open={report.tools.some((t) => t.status !== "completed")}
            >
              <summary>{chatT(`工具与网关调用 · ${report.tools.length} 次`, `Lệnh gọi công cụ và gateway · ${report.tools.length} lần`)}</summary>
              <div className="diagnostic-tools">
                {report.tools.map((tool, i) => (
                  <div className="diagnostic-event" key={`${tool.id}-${i}`}>
                    <div>
                      <code>{tool.name}</code>
                      <span>{toolSources[tool.source] || tool.source}</span>
                      <span>{statuses[tool.status] || tool.status}</span>
                      {tool.exitCode != null ? (
                        <code>{chatT("退出码", "Mã thoát")} {tool.exitCode}</code>
                      ) : null}
                    </div>
                    {tool.error ? <pre>{tool.error}</pre> : null}
                    {tool.requestId ? (
                      <p>
                        Request ID <code>{tool.requestId}</code>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {report.timeline?.length ? (
            <details className="diagnostic-stderr">
              <summary>{chatT(`执行时间线 · ${report.timeline.length} 条记录`, `Dòng thời gian thực thi · ${report.timeline.length} bản ghi`)}</summary>
              <pre>
                {report.timeline
                  .map(
                    (e) =>
                      `[${time(e.at)}] (${e.source || "cli"}) ${e.kind}${e.tool ? ` ${e.tool}` : ""}${e.code ? ` [${e.code}]` : ""}${e.message ? ` — ${e.message}` : ""}`,
                  )
                  .join("\n")}
              </pre>
            </details>
          ) : null}
          {report.error &&
          !report.attempts?.some((attempt) => attempt.error) ? (
            <pre className="diagnostic-excerpt">{report.error}</pre>
          ) : null}
          {!report.attempts?.length && !report.error ? (
            <p className="diagnostic-note">{chatT("尚未记录 CLI 调用详情。", "Chưa ghi chi tiết lệnh gọi CLI.")}</p>
          ) : null}
          <p className="diagnostic-note">
            {chatT("已脱敏，包含有限的执行现场与错误片段。Request / Trace ID 仅在 CLI 或上游实际返回时显示。", "Đã ẩn dữ liệu nhạy cảm, gồm ngữ cảnh thực thi và đoạn lỗi giới hạn. Request / Trace ID chỉ hiển thị khi CLI hoặc dịch vụ phía trước thực sự trả về.")}
            {report.truncated ? chatT("部分记录已按大小限制截断。", "Một số bản ghi đã bị cắt theo giới hạn kích thước.") : ""}
          </p>
          {report.status === "running" ? (
            <button
              type="button"
              className="diagnostic-refresh"
              onClick={load}
              disabled={loading}
            >
              {chatT("刷新诊断", "Làm mới chẩn đoán")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
