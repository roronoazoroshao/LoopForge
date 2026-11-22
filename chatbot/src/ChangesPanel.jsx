import { chatT } from "./locale";
import { useEffect, useRef, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import { IconButton } from "./ui";
import { branchCompareUrl } from "./changes";
import "./changes-panel.css";

// Rendering a huge generated file line by line is slower than it is useful.
const MAX_LINES = 2000;
const NO_FILES = [];

function diffRows(patch) {
  const rows = [];
  for (const hunk of patch?.hunks || []) {
    rows.push({ kind: "hunk", header: hunk.header, section: hunk.section });
    for (const line of hunk.lines || []) rows.push(line);
  }
  return rows;
}

function DiffLine({ line }) {
  return (
    <div className={`diff-line is-${line.kind}`}>
      <span className="diff-no" aria-hidden="true">
        {line.kind === "add" ? "" : line.oldNo || ""}
      </span>
      <span className="diff-no" aria-hidden="true">
        {line.kind === "del" ? "" : line.newNo || ""}
      </span>
      <span className="diff-mark" aria-hidden="true">
        {line.kind === "add" ? "+" : line.kind === "del" ? "-" : ""}
      </span>
      <span className="diff-text">{line.text || " "}</span>
    </div>
  );
}

function FileRow({ file, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`change-row ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      title={file.path}
      aria-current={selected ? "true" : undefined}
    >
      <span className={`change-status is-${file.status}`} aria-label={file.label}>
        {file.status}
      </span>
      <span className="change-copy">
        <strong>{file.name}</strong>
        <small>{file.dir || file.repository || chatT("工作区根目录", "Thư mục gốc workspace")}</small>
      </span>
      <span className="change-stat">
        {file.additions ? <i className="is-add">+{file.additions}</i> : null}
        {file.deletions ? <i className="is-del">−{file.deletions}</i> : null}
        {file.untracked ? <i className="is-new">{chatT("未跟踪", "Chưa được theo dõi")}</i> : null}
      </span>
      <HarnessIcon name="chevron-right" size={13} className="change-row-arrow" />
    </button>
  );
}

// What the empty state has to explain: this view only reads the working tree,
// so a session that committed or pushed still shows nothing here. Naming the
// branches and linking to the code host keeps that case from looking like a broken panel.
function BranchEntry({ repository }) {
  const compareUrl = branchCompareUrl(repository);
  if (!repository?.workBranch) return null;
  return (
    <>
      <small className="changes-branch">
        {chatT("工作分支", "Nhánh làm việc")} <code>{repository.workBranch}</code>
        {repository.baseBranch && repository.baseBranch !== repository.workBranch ? (
          <>
            {chatT("，基线", ", baseline")} <code>{repository.baseBranch}</code>
          </>
        ) : null}
      </small>
      {compareUrl ? (
        <a
          className="changes-branch-link"
          href={compareUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <HarnessIcon name="preview-expand" size={13} />
          {chatT("在代码仓库查看这个分支的改动", "Xem thay đổi của nhánh này trong kho mã")}
        </a>
      ) : null}
    </>
  );
}

function EmptyChanges({ repository }) {
  return (
    <div className="changes-empty">
      <HarnessIcon name="git" size={24} />
      <p>{chatT("工作区没有未提交改动。", "Workspace không có thay đổi chưa commit.")}</p>
      {repository?.workBranch ? null : (
        <small>{chatT("助手写入或命令修改的文件会出现在这里，相对 HEAD 实时统计。", "Tệp do trợ lý ghi hoặc lệnh sửa sẽ xuất hiện tại đây, thống kê trực tiếp so với HEAD.")}</small>
      )}
      <small>{chatT("已提交或已推送的改动不计入这里。", "Không tính thay đổi đã commit hoặc push.")}</small>
      <BranchEntry repository={repository} />
    </div>
  );
}

// The "改动" view of the conversation side panel: every file the agent touched
// in the workspace, with a line-by-line diff. The workspace git state is the
// source of truth, so files changed by shell commands show up too.
export default function ChangesPanel({ changes }) {
  const [selectedPath, setSelectedPath] = useState("");
  const [patches, setPatches] = useState({});
  const [loadingPath, setLoadingPath] = useState("");
  const [error, setError] = useState("");
  const inflight = useRef(new Set());
  const files = changes?.files || NO_FILES;
  const selected = files.find((file) => file.path === selectedPath) || null;
  const loadFile = changes?.loadFile;
  // The run records its own branches; the workspace payload only carries names.
  const repository = changes?.repositories?.[0] || null;

  useEffect(() => {
    if (selectedPath && !selected) setSelectedPath("");
  }, [selectedPath, selected]);

  useEffect(() => {
    if (!selected || selected.patch || patches[selected.path]) return;
    if (inflight.current.has(selected.path)) return;
    if (!loadFile) return;
    inflight.current.add(selected.path);
    setLoadingPath(selected.path);
    setError("");
    loadFile(selected)
      .then((patch) => {
        setPatches((previous) => ({ ...previous, [selected.path]: patch }));
      })
      .catch((reason) => setError(reason.message))
      .finally(() => {
        inflight.current.delete(selected.path);
        setLoadingPath("");
      });
  }, [selected, patches, loadFile]);

  const status = changes?.status || "idle";
  const toolbar = (
    <div className="changes-toolbar">
      <span className="changes-summary">
        {files.length ? (
          <>
            <strong>{files.length}</strong> {chatT("个文件", "tệp")}
            <i className="is-add">+{changes.additions || 0}</i>
            <i className="is-del">−{changes.deletions || 0}</i>
          </>
        ) : (
          chatT("相对 HEAD", "So với HEAD")
        )}
      </span>
      <IconButton label={chatT("刷新改动", "Làm mới thay đổi")} onClick={changes?.refresh}>
        <HarnessIcon name="refresh" size={14} />
      </IconButton>
    </div>
  );

  if (selected) {
    const patch = selected.patch || patches[selected.path] || null;
    const rows = diffRows(patch);
    const shown = rows.length > MAX_LINES ? rows.slice(0, MAX_LINES) : rows;
    return (
      <div className="changes-panel is-detail">
        <div className="changes-detail-bar">
          <button
            type="button"
            className="changes-back"
            onClick={() => setSelectedPath("")}
          >
            <HarnessIcon name="chevron-left" size={13} />
            <span>{chatT("返回改动列表", "Quay lại danh sách thay đổi")}</span>
          </button>
          <span className="changes-detail-path" title={selected.path}>
            {selected.path}
          </span>
        </div>
        <div className="changes-diff">
          {loadingPath === selected.path ? (
            <p className="changes-note">{chatT("正在读取改动…", "Đang đọc thay đổi…")}</p>
          ) : error ? (
            <p className="changes-note is-error" role="alert">
              {error}
            </p>
          ) : !patch ? (
            <p className="changes-note">
              {chatT("这个文件没有可展示的文本改动（可能是二进制文件或内容过大）。", "Tệp này không có thay đổi văn bản có thể hiển thị (có thể là tệp nhị phân hoặc quá lớn).")}
            </p>
          ) : patch.binary ? (
            <p className="changes-note">{chatT("二进制文件，无法逐行展示。", "Tệp nhị phân, không thể hiển thị từng dòng.")}</p>
          ) : rows.length ? (
            <>
              {selected.untracked ? (
                <p className="changes-note">
                  {chatT("该文件尚未纳入 git，下面是它的完整内容。", "Tệp chưa được git theo dõi, bên dưới là toàn bộ nội dung.")}
                </p>
              ) : null}
              <div className="diff-body">
                {shown.map((row, index) =>
                  row.kind === "hunk" ? (
                    <div className="diff-hunk" key={`h${index}`}>
                      <span>{row.header}</span>
                      {row.section ? <em>{row.section}</em> : null}
                    </div>
                  ) : (
                    <DiffLine key={`l${index}`} line={row} />
                  ),
                )}
              </div>
              {rows.length > shown.length ? (
                <p className="changes-note">
                  {chatT(`改动较大，仅展示前 ${MAX_LINES} 行（共 ${rows.length} 行）。`, `Thay đổi lớn, chỉ hiển thị ${MAX_LINES} dòng đầu (tổng ${rows.length} dòng).`)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="changes-note">{chatT("这个文件没有内容差异。", "Tệp này không có khác biệt nội dung.")}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="changes-panel">
      {toolbar}
      {changes?.warning ? (
        <p className="changes-note is-error" role="alert">
          {changes.warning}
        </p>
      ) : null}
      {status === "loading" ? (
        <p className="changes-note">{chatT("正在读取工作区改动…", "Đang đọc thay đổi workspace…")}</p>
      ) : status === "unavailable" || status === "error" ? (
        <div className="changes-empty">
          <HarnessIcon name="git" size={24} />
          <p>{changes?.reason || chatT("工作区不可用。", "Workspace không khả dụng.")}</p>
          <small>{chatT("工作区可用后，这里会显示本次会话的改动。", "Khi workspace khả dụng, thay đổi của cuộc trò chuyện này sẽ xuất hiện tại đây.")}</small>
          {status === "unavailable" ? <BranchEntry repository={repository} /> : null}
        </div>
      ) : status === "idle" ? (
        <div className="changes-empty">
          <HarnessIcon name="git" size={24} />
          <p>{chatT("这个会话还没有工作区。", "Cuộc trò chuyện này chưa có workspace.")}</p>
          <small>{chatT("助手开始改代码后，改动会出现在这里。", "Sau khi trợ lý bắt đầu sửa mã, thay đổi sẽ hiện tại đây.")}</small>
        </div>
      ) : files.length ? (
        <div className="changes-list" role="list">
          {files.map((file) => (
            <FileRow
              key={file.path}
              file={file}
              selected={file.path === selectedPath}
              onSelect={() => setSelectedPath(file.path)}
            />
          ))}
        </div>
      ) : (
        <EmptyChanges repository={repository} />
      )}
      {changes?.truncated ? (
        <p className="changes-note">
          {chatT("改动内容超过预览上限，部分文件的行数统计可能不完整。", "Nội dung thay đổi vượt giới hạn xem trước, thống kê số dòng của một số tệp có thể chưa đầy đủ.")}
        </p>
      ) : null}
      <p className="changes-footnote">
        {chatT("只统计相对 HEAD 的未提交改动，包含命令修改的文件；提交 MR 前请逐项核对。", "Chỉ thống kê thay đổi chưa commit so với HEAD, gồm tệp sửa bằng lệnh; kiểm tra từng mục trước khi gửi MR.")}
      </p>
    </div>
  );
}
