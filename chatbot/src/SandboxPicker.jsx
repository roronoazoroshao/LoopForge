import { chatT } from "./locale";
import React, { useEffect, useRef, useState } from "react";
import { SelectMenu } from "./ui";
import HarnessIcon from "./HarnessIcon";
import "./sandbox-picker.css";

export function conversationSandboxOptions(sandboxes, project, selected = "") {
  const available = (sandboxes || []).filter(
    (s) => s.driver === "docker" && (s.projectId === project?.id || s.shared),
  );
  const options = [
    { value: "", label: chatT("由 Agent 选择", "Để tác tử chọn") },
    ...available.map((s) => ({ value: s.id, label: s.name || s.id })),
  ];
  if (selected && !available.some((s) => s.id === selected)) {
    options.push({
      value: selected,
      label: chatT(`环境已不可用 · ${selected}`, `Môi trường không còn khả dụng · ${selected}`),
      disabled: true,
    });
  }
  return options;
}

export default function SandboxPicker({ chat, onCreate }) {
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const disabled = !!(
    chat.busy ||
    chat.sandboxBusy ||
    chat.readOnly
  );
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  if (!chat.projectId) return null;
  if (chat.sandboxLocked) {
    return (
      <span
        className="sandbox-context sandbox-fixed"
        title={chatT("任务会话使用任务的运行环境。", "Cuộc trò chuyện tác vụ dùng môi trường thực thi của tác vụ.")}
      >
        <HarnessIcon name="lock" size={12} interactive={false} />
        <span>{chat.workspaceSandbox?.name || chatT("任务运行环境", "Môi trường thực thi tác vụ")}</span>
      </span>
    );
  }
  const project = chat.projects.find((p) => p.id === chat.projectId);
  const options = conversationSandboxOptions(
    chat.sandboxes,
    project,
    chat.sandboxProfileId,
  );
  const label =
    options.find((o) => o.value === chat.sandboxProfileId)?.label ||
    options[0].label;
  const menuOptions = options
    .filter((o) => !o.disabled)
    .map((o) => ({
      id: o.value,
      label: o.label,
      description: o.value ? "" : chatT("按要改的代码自动选择，拿不准时用平台通用 Docker", "Tự chọn theo mã cần sửa; nếu chưa rõ thì dùng Docker chung của nền tảng"),
      icon: o.value ? "terminal" : "folder",
    }));
  return (
    <span className="menu-anchor sandbox-context" title={label}>
      <button
        ref={trigger}
        type="button"
        className="context-pill sandbox-picker"
        aria-label={chatT(`运行环境：${label}`, `Môi trường thực thi: ${label}`)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <HarnessIcon name="terminal" size={13} interactive={false} />
        <span>{label}</span>
        <HarnessIcon name="chevron-down" size={12} interactive={false} />
      </button>
      <SelectMenu
        open={open}
        label={chatT("沙箱", "Sandbox")}
        value={chat.sandboxProfileId || ""}
        options={menuOptions}
        onSelect={(id) => void chat.selectSandbox(id)}
        onClose={() => setOpen(false)}
        anchorRef={trigger}
        searchable
        actions={
          onCreate
            ? [
                {
                  id: "new-sandbox",
                  label: chatT("新增沙箱", "Thêm sandbox"),
                  icon: "plus",
                  onSelect: onCreate,
                },
              ]
            : []
        }
      />
    </span>
  );
}
