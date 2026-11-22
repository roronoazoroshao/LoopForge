import { chatT } from "./locale";
import React, { useEffect, useRef, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import { SelectMenu } from "./ui";
import { executionLocked } from "./execution-target";
import "./execution-machine-picker.css";

export default function ExecutionMachinePicker({ chat, onManage }) {
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const locked = executionLocked(chat.session);
  const disabled = !!(
    chat.busy ||
    chat.machineSaving ||
    chat.readOnly ||
    chat.local ||
    !chat.user ||
    chat.user.isGuest
  );
  useEffect(() => {
    if (disabled || locked) setOpen(false);
  }, [disabled, locked]);

  const execution = chat.session?.executionTarget;
  const runnerId = locked
    ? execution?.pool === "cloud"
      ? ""
      : execution?.runnerId || ""
    : chat.defaultRunnerId || "";
  const machine = chat.machines?.find((row) => row.id === runnerId);
  const known = locked ? !!execution : chat.machinesReady;
  const loadError = locked ? "" : chat.machineError;
  const label = !known
    ? loadError
      ? chatT("执行机器加载失败", "Không tải được máy thực thi")
      : chatT("加载执行机器…", "Đang tải máy thực thi…")
    : runnerId
      ? machine?.name || runnerId
      : chatT("LoopForge 云端", "Đám mây LoopForge");
  const online =
    known &&
    (runnerId
      ? machine?.status === "online"
      : chat.cloudPool?.configured
        ? chat.cloudPool.online > 0
        : true);
  const title = locked
    ? loadError || chatT(`当前会话执行机器：${label}。会话已绑定，后续运行始终使用此机器。`, `Máy thực thi cuộc trò chuyện hiện tại: ${label}. Cuộc trò chuyện đã liên kết; các lượt sau luôn dùng máy này.`)
    : chat.machineError || chatT("选择执行机器，发送首条消息后固定", "Chọn máy thực thi; cố định sau khi gửi tin nhắn đầu tiên");

  if (locked)
    return (
      <span className="machine-context machine-fixed" title={title}>
        <HarnessIcon name="server" size={13} interactive={false} />
        <span>{label}</span>
        <HarnessIcon name="lock" size={11} interactive={false} />
      </span>
    );

  const options = chat.machinesReady
    ? [
        {
          id: "",
          label: chatT("LoopForge 云端", "Đám mây LoopForge"),
          icon: "server",
          description:
            chat.cloudPool?.configured && !chat.cloudPool.online
              ? chatT("暂无在线机器", "Chưa có máy trực tuyến")
              : chatT("平台自动分配", "Nền tảng tự phân bổ"),
        },
        ...(chat.machines || []).map((row) => ({
          id: row.id,
          label: row.name || row.id,
          icon: "monitor",
          description: row.status === "online" ? chatT("在线", "Trực tuyến") : chatT("离线，执行前需启动", "Ngoại tuyến, cần khởi động trước khi thực thi"),
        })),
      ]
    : [];

  return (
    <span className="menu-anchor machine-context">
      <button
        ref={trigger}
        type="button"
        className="context-pill machine-picker"
        title={title}
        aria-label={chatT(`执行机器：${label}`, `Máy thực thi: ${label}`)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={chat.machineSaving || undefined}
        disabled={disabled}
        onClick={() => {
          if (!open) void chat.refreshMachines?.();
          setOpen(!open);
        }}
      >
        <HarnessIcon name="server" size={13} interactive={false} />
        <span>{label}</span>
        <i
          className={`connection-dot${online ? " online" : ""}`}
          aria-hidden="true"
        />
        <HarnessIcon name="chevron-down" size={12} interactive={false} />
      </button>
      <SelectMenu
        open={open}
        label={chatT("会话执行机器", "Máy thực thi cuộc trò chuyện")}
        value={chat.defaultRunnerId || ""}
        options={options}
        onSelect={(id) => void chat.selectMachine(id)}
        onClose={() => setOpen(false)}
        anchorRef={trigger}
        searchable
        emptyText={
          chat.machinesReady
            ? chatT("没有匹配的执行机器", "Không có máy thực thi phù hợp")
            : chat.machineError
              ? chatT("执行机器加载失败，请重试", "Không tải được máy thực thi, hãy thử lại")
              : chatT("正在加载执行机器", "Đang tải máy thực thi")
        }
        actions={[
          {
            id: "refresh-machines",
            label: chat.machineError ? chatT("重新加载", "Tải lại") : chatT("刷新机器列表", "Làm mới danh sách máy"),
            icon: "refresh",
            onSelect: chat.refreshMachines,
          },
          ...(onManage
            ? [
                {
                  id: "manage-machines",
                  label: chatT("管理执行机器", "Quản lý máy thực thi"),
                  icon: "settings",
                  onSelect: onManage,
                },
              ]
            : []),
        ]}
      />
    </span>
  );
}
