import { chatT } from "./locale.js";
const builtinDisplay = (value) => chatT(value, Object.hasOwn(BUILTIN_VI, value) ? BUILTIN_VI[value] : value);
const quickAccessListSeparator = () => chatT("、", ", ");
const BUILTIN_VI = {
  "需求定型": "Định hình yêu cầu",
  "方案设计": "Thiết kế giải pháp",
  "代码实现": "Triển khai mã",
  "独立评审": "Rà soát độc lập",
  "测试验证": "Xác minh kiểm thử",
  "发起 MR": "Mở MR",
  "交付汇总": "Tổng kết bàn giao",
  "通用后端交付 SOP": "SOP bàn giao backend chung",
  "后端交付 SOP": "SOP bàn giao backend",
  "澄清需求边界与验收标准": "Làm rõ phạm vi yêu cầu và tiêu chí nghiệm thu",
  "产出技术方案与实现计划": "Tạo phương án kỹ thuật và kế hoạch triển khai",
  "在工作分支实现并自测": "Triển khai và tự kiểm thử trên nhánh làm việc",
  "审查改动质量与规范": "Rà soát chất lượng và quy chuẩn thay đổi",
  "运行测试并给出验收结论": "Chạy kiểm thử và đưa kết luận nghiệm thu",
  "推送分支并创建合并请求": "Push nhánh và tạo yêu cầu hợp nhất",
  "汇总产物与沉淀知识": "Tổng hợp sản phẩm đầu ra và lưu tri thức"
};
import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "../../web/app/git-ssh.js";
import HarnessIcon from "./HarnessIcon";
import SlidingTabs from "./SlidingTabs";
import { api, canChatInProject, canManageProjectRepos, write } from "./api";
import { usePanelPresence } from "./usePanelPresence";
import { EXECUTORS, personalEngineConfigured } from "./engines.js";
import { openCredentialSettings } from "./credentials";
import "./quick-access-wizard.css";

const DEFAULT_SOP_ID = "generic-backend-delivery";
const CREDENTIALS_REQUIRED = chatT("请先添加一个 Git 凭据或执行器。", "Trước tiên thêm một thông tin xác thực Git hoặc trình thực thi.");

// Display names for the models users without their own key may use.
export function sharedModelNames(models, fallback = "") {
  const list = Array.isArray(models) && models.length ? models : fallback ? [fallback] : [];
  return list
    .map((id) => (id === "deepseek-v4.1-flash" ? "Deepseek-V4.1-Flash" : id))
    .join(quickAccessListSeparator());
}

const STEPS = [
  {
    id: "auth",
    title: chatT("凭据与授权", "Thông tin xác thực và cấp quyền"),
    desc: chatT("仓库访问与执行器", "Truy cập kho mã và trình thực thi"),
  },
  {
    id: "project",
    title: chatT("项目与仓库", "Dự án và kho mã"),
    desc: chatT("选择或新建项目，绑定 Git 仓库", "Chọn hoặc tạo dự án mới, liên kết kho Git"),
  },
  {
    id: "workflow",
    title: chatT("默认角色与 SOP", "Vai trò và SOP mặc định"),
    desc: chatT("使用平台默认角色与通用交付流程", "Dùng vai trò mặc định của nền tảng và quy trình bàn giao chung"),
  },
  {
    id: "done",
    title: chatT("完成", "Hoàn tất"),
    desc: chatT("保存配置，直接开始使用", "Lưu cấu hình, bắt đầu sử dụng ngay"),
  },
];

// Vietnamese prompts are generated only when provisioning a new fallback SOP.
// IDs, output artifact paths and template variables stay protocol-stable.
const FALLBACK_ROLE_PROMPTS_VI = {
  "loopforge-requirement": "Dựa trên yêu cầu đầu vào và hiện trạng kho mã, xác nhận mục tiêu, phạm vi, hạng mục loại trừ và tiêu chí nghiệm thu. Tạo tài liệu yêu cầu có cấu trúc cùng kế hoạch thực hiện.\n\nĐầu vào tác vụ: {{input}}",
  "loopforge-design": "Phân tích mô-đun bị ảnh hưởng và chuỗi lời gọi; thiết kế giao diện, mô hình dữ liệu và phương án thay đổi tối thiểu. Nêu rõ rủi ro và phạm vi kiểm chứng.\n\nĐầu vào tác vụ: {{input}}",
  "loopforge-implement": "Triển khai mã theo phương án và kế hoạch, chạy kiểm thử đơn vị của các mô-đun bị ảnh hưởng và ghi báo cáo thay đổi.\n\nĐầu vào tác vụ: {{input}}",
  "loopforge-review": "Rà soát độc lập tính đúng đắn của thay đổi mã, nguy cơ hồi quy, ranh giới bảo mật và bằng chứng kiểm thử. Đưa ra kết luận rà soát.\n\nĐầu vào tác vụ: {{input}}",
  "loopforge-test": "Thực hiện kiểm thử tự động hoặc kiểm thử hồi quy theo tiêu chí nghiệm thu. Đối chiếu từng tiêu chí và xuất báo cáo kiểm thử.\n\nĐầu vào tác vụ: {{input}}",
  "loopforge-mr": "Đẩy nhánh làm việc lên kho mã, tạo hoặc cập nhật Pull Request và tổng hợp nội dung thay đổi.\n\nĐầu vào tác vụ: {{input}}",
  "loopforge-summary": "Tổng hợp thay đổi đã bàn giao, kết quả xác minh và liên kết MR, đồng thời đúc kết kinh nghiệm dự án có thể tái sử dụng.\n\nĐầu vào tác vụ: {{input}}",
};
const fallbackRolePrompt = role => chatT(role.prompt, FALLBACK_ROLE_PROMPTS_VI[role.id] || role.prompt);

const FALLBACK_ROLES = [
  {
    id: "loopforge-requirement",
    name: "需求定型",
    description: "澄清需求边界与验收标准",
    prompt: "根据需求输入与代码库现状，确认目标、范围、排除项与验收标准，产出结构化需求说明与执行计划。\n\n任务输入：{{input}}",
    artifactId: "requirement-report",
    artifactPath: "requirement-report.md",
  },
  {
    id: "loopforge-design",
    name: "方案设计",
    description: "产出技术方案与实现计划",
    prompt: "分析受影响模块与调用链，设计接口、数据模型与最小改动方案，明确风险与验证范围。\n\n任务输入：{{input}}",
    artifactId: "tech-design",
    artifactPath: "tech-design.md",
  },
  {
    id: "loopforge-implement",
    name: "代码实现",
    description: "在工作分支实现并自测",
    prompt: "按方案与计划完成代码实现，运行受影响模块的单元测试并记录变更报告。\n\n任务输入：{{input}}",
    artifactId: "change-report",
    artifactPath: "change-report.md",
  },
  {
    id: "loopforge-review",
    name: "独立评审",
    description: "审查改动质量与规范",
    prompt: "独立审查代码改动的正确性、回归风险、安全边界与测试证据，给出评审结论。\n\n任务输入：{{input}}",
    artifactId: "review-report",
    artifactPath: "review-report.md",
  },
  {
    id: "loopforge-test",
    name: "测试验证",
    description: "运行测试并给出验收结论",
    prompt: "按验收标准执行自动化或回归测试，核对每条验收项并输出测试报告。\n\n任务输入：{{input}}",
    artifactId: "test-report",
    artifactPath: "test-report.md",
  },
  {
    id: "loopforge-mr",
    name: "发起 MR",
    description: "推送分支并创建合并请求",
    prompt: "将工作分支推送到代码仓库，创建或更新 Pull Request 并整理变更摘要。\n\n任务输入：{{input}}",
    artifactId: "mr-body",
    artifactPath: "mr-body.md",
  },
  {
    id: "loopforge-summary",
    name: "交付汇总",
    description: "汇总产物与沉淀知识",
    prompt: "汇总本次交付的改动、验证结果与 MR 链接，提炼可复用的项目经验。\n\n任务输入：{{input}}",
    artifactId: "summary-report",
    artifactPath: "summary-report.md",
  },
];

const FALLBACK_NODES = [
  { id: "requirement", name: "需求定型", type: "agent", agentId: "loopforge-requirement", metricStage: "clarification" },
  { id: "design", name: "方案设计", type: "agent", agentId: "loopforge-design", metricStage: "development" },
  { id: "implement", name: "代码实现", type: "agent", agentId: "loopforge-implement", metricStage: "development" },
  { id: "review", name: "独立评审", type: "agent", agentId: "loopforge-review", metricStage: "testing" },
  { id: "test", name: "测试验证", type: "agent", agentId: "loopforge-test", metricStage: "testing" },
  { id: "mr", name: "发起 MR", type: "agent", agentId: "loopforge-mr", metricStage: "development" },
  { id: "summary", name: "交付汇总", type: "agent", agentId: "loopforge-summary", metricStage: "none" },
];

const BRANCH_OPTIONS = [
  { value: "main", label: "main", hint: chatT("GitHub 默认主分支", "Nhánh chính mặc định của GitHub") },
  { value: "master", label: "master", hint: chatT("传统主分支", "Nhánh chính truyền thống") },
  { value: "preview", label: "preview", hint: chatT("预发验证分支", "Nhánh xác minh trước phát hành") },
  { value: "develop", label: "develop", hint: chatT("开发集成分支", "Nhánh tích hợp phát triển") },
];

let closeActiveSelect = null;

/**
 * HarnessSelect: adapted from Harness UI's AppSelect.vue.
 * Supports searchable filtering, custom typed value, keyboard navigation,
 * animated chevron rotation, and a portal dropdown with presence transition.
 */
export function HarnessSelect({
  value,
  options = [],
  onChange,
  placeholder = chatT("请选择", "Vui lòng chọn"),
  ariaLabel,
  searchable = false,
  searchPlaceholder = chatT("搜索选项…", "Tìm tùy chọn…"),
  allowCustom = false,
  disabled = false,
}) {
  const selectId = `qa-select-${useId().replaceAll(":", "")}`;
  const listboxId = `${selectId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 240,
    maxHeight: 280,
    placement: "bottom",
  });
  const presence = usePanelPresence(open, 160);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const matched = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );
  const selectedLabel = matched
    ? matched.label
    : allowCustom && value
      ? value
      : placeholder;
  const isPlaceholder = !matched && !(allowCustom && value);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered =
      !q || !searchable
        ? options
        : options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(q) ||
              opt.value.toLowerCase().includes(q) ||
              (opt.hint || "").toLowerCase().includes(q),
          );
    const trimmed = query.trim();
    const canCustom =
      allowCustom &&
      searchable &&
      trimmed &&
      !options.some((opt) => opt.value === trimmed);
    const customRow = canCustom
      ? [
          {
            value: trimmed,
            label: chatT(`使用 "${trimmed}"`, `Dùng "${trimmed}"`),
            hint: chatT("自定义", "Tùy chỉnh"),
            custom: true,
          },
        ]
      : [];
    return [...customRow, ...filtered];
  }, [options, query, searchable, allowCustom]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const place = useCallback(() => {
    const trig = triggerRef.current;
    if (!trig) return;
    const rect = trig.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const maxPanelHeight = 280;
    const panelHeight = Math.min(
      panelRef.current?.offsetHeight || maxPanelHeight,
      maxPanelHeight,
    );
    const below = window.innerHeight - rect.bottom - gap - margin;
    const above = rect.top - gap - margin;
    const flipUp = below < panelHeight && above > below;
    const maxHeight = Math.max(
      120,
      Math.min(maxPanelHeight, flipUp ? above : below),
    );
    const visibleHeight = Math.min(panelHeight, maxHeight);
    const top = flipUp
      ? Math.max(margin, rect.top - gap - visibleHeight)
      : Math.min(rect.bottom + gap, window.innerHeight - margin - visibleHeight);
    const width = Math.max(180, rect.width);
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - width - margin),
    );
    setPosition({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(maxHeight),
      placement: flipUp ? "top" : "bottom",
    });
  }, []);

  useLayoutEffect(() => {
    if (presence.mounted) place();
  }, [presence.mounted, rows.length, place]);

  useEffect(() => {
    if (!open) return undefined;
    if (closeActiveSelect && closeActiveSelect !== close) closeActiveSelect();
    closeActiveSelect = close;
    const idx = Math.max(
      0,
      options.findIndex((opt) => opt.value === value),
    );
    setActiveIndex(idx);
    const frame = requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (closeActiveSelect === close) closeActiveSelect = null;
    };
  }, [open, close, options, searchable, value]);

  useEffect(() => {
    if (!presence.mounted) return undefined;
    const onOutside = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      )
        return;
      close();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onOutside, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onOutside, true);
    };
  }, [presence.mounted, place, close]);

  function choose(nextValue) {
    if (disabled) return;
    onChange?.(nextValue);
    close();
    triggerRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event) {
    if (disabled || event.isComposing) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (rows.length) setActiveIndex((i) => (i + 1) % rows.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (rows.length)
        setActiveIndex((i) => (i - 1 + rows.length) % rows.length);
      return;
    }
    if (event.key === "Enter" || (event.key === " " && !searchable)) {
      event.preventDefault();
      const target = rows[activeIndex];
      if (target) choose(target.value);
    }
  }

  return (
    <div className="qa-select-root">
      <button
        ref={triggerRef}
        type="button"
        className={`qa-select-trigger ${open ? "is-open" : ""}`}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        <span
          className={`qa-select-value ${isPlaceholder ? "is-placeholder" : ""}`}
        >
          {selectedLabel}
        </span>
        {matched?.hint ? (
          <span className="qa-select-trigger-hint">{matched.hint}</span>
        ) : null}
        <HarnessIcon
          name="chevron-down"
          size={14}
          interactive={false}
          className={`qa-select-chevron ${open ? "is-open" : ""}`}
        />
      </button>

      {presence.mounted
        ? createPortal(
            <div
              ref={panelRef}
              className="qa-select-panel"
              data-phase={presence.phase}
              data-placement={position.placement}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              onKeyDown={onKeyDown}
            >
              {searchable ? (
                <label className="qa-select-search">
                  <HarnessIcon name="search" size={14} interactive={false} />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                  />
                </label>
              ) : null}
              <div
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel}
                className="qa-select-options"
              >
                {rows.length ? (
                  rows.map((row, index) => {
                    const selected = row.value === value;
                    const active = index === activeIndex;
                    return (
                      <button
                        key={(row.custom ? "custom:" : "opt:") + row.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={[
                          "qa-select-option",
                          selected && "is-selected",
                          active && "is-active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(row.value)}
                      >
                        <span className="qa-select-option-label">
                          {row.label}
                        </span>
                        {row.hint ? (
                          <span className="qa-select-option-hint">
                            {row.hint}
                          </span>
                        ) : null}
                        {selected ? (
                          <HarnessIcon
                            name="check"
                            size={14}
                            interactive={false}
                            className="qa-select-option-check"
                          />
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="qa-select-empty">{chatT("没有匹配的选项", "Không có tùy chọn phù hợp")}</p>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * HarnessSwitch: adapted from Harness UI's AppSwitch.vue.
 */
export function HarnessSwitch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`qa-switch ${checked ? "is-on" : ""}`}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <span className="qa-switch-thumb" aria-hidden="true" />
    </button>
  );
}

/** Pill whose dot pops once each time `ok` flips; alternating keyframe names restart it. */
function StatusPill({ ok, okLabel = chatT("已就绪", "Đã sẵn sàng"), needLabel = chatT("待配置", "Chờ cấu hình") }) {
  const previous = useRef(ok);
  const [pops, setPops] = useState(0);
  useEffect(() => {
    if (previous.current === ok) return;
    previous.current = ok;
    setPops((n) => n + 1);
  }, [ok]);
  return (
    <span
      className={`qa-status-pill ${ok ? "is-ok" : "is-need"}`}
      data-pop={pops ? (pops % 2 ? "a" : "b") : undefined}
    >
      {ok ? okLabel : needLabel}
    </span>
  );
}

function VerifyMessage({ result, okText }) {
  const text = result.valid
    ? okText
    : result.error || chatT(`缺少权限：${(result.missing || []).join(quickAccessListSeparator())}`, `Thiếu quyền: ${(result.missing || []).join(", ")}`);
  return (
    <p
      key={text}
      className={`qa-verify-msg qa-msg-in ${result.valid ? "is-ok" : "is-err"}`}
    >
      <HarnessIcon
        name={result.valid ? "check" : "info"}
        size={13}
        interactive={false}
      />
      <span>{text}</span>
    </p>
  );
}

/** Both labels share one grid cell so the button keeps its widest width while busy. */
function BusyLabel({ busy, busyLabel, children }) {
  return (
    <span className="qa-btn-label">
      <span className="qa-btn-label-cell" aria-hidden={busy || undefined}>
        {children}
      </span>
      <span className="qa-btn-label-cell" aria-hidden={!busy || undefined}>
        <HarnessIcon
          name="arc-spinner"
          size={14}
          motion={busy ? "busy" : "idle"}
          interactive={false}
        />
        {busyLabel}
      </span>
    </span>
  );
}

function parseGitHubRepo(raw) {
  let value = String(raw || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^git\s+clone\s+/i, "")
    .replace(/^github:/i, "https://github.com/")
    .replace(/^(?:git@github\.com:|ssh:\/\/git@github\.com(?::22)?\/)/i, "https://github.com/");
  if (/^github\.com\//i.test(value)) value = `https://${value}`;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol)
  )
    return null;
  const [owner = "", rawName = ""] = url.pathname.split("/").filter(Boolean);
  const name = rawName.replace(/\.git$/i, "");
  const valid = (seg) =>
    /^[A-Za-z0-9_.-]+$/.test(seg) && seg !== "." && seg !== "..";
  if (!valid(owner) || !valid(name)) return null;
  return {
    project: `github:${owner}/${name}`,
    provider: "github",
    name,
    webUrl: `https://github.com/${owner}/${name}`,
    cloneUrl: `https://github.com/${owner}/${name}.git`,
  };
}

// Explicit SSH keeps its transport. Managed HTTPS links use the configured host.
export function parseGongfengRepo(raw, host = "") {
  return globalThis.LoopForgeGitSSH(raw) ||
    globalThis.LoopForgeGongfengRepository(raw, host) ||
    globalThis.LoopForgeGitHTTPS(raw) ||
    parseGitHubRepo(raw);
}

function slugifyProjectId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function deriveProjectKey(value) {
  const clean = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  return clean || "PROJ";
}

async function provisionFallbackProjectSOP(projectId, workflowId, owner) {
  const sandboxId = `local-${projectId}`.slice(0, 60);
  await write(
    "/api/sandboxes",
    {
      id: sandboxId,
      name: chatT("本地开发沙箱", "Sandbox phát triển cục bộ"),
      projectId,
      driver: "local",
      shared: false,
    },
    "PUT",
  );

  const agentIdMap = {};
  for (const role of FALLBACK_ROLES) {
    const agentId = `${role.id}-${projectId}`.slice(0, 60);
    agentIdMap[role.id] = agentId;
    await write(
      "/api/agents",
      {
        id: agentId,
        name: builtinDisplay(role.name),
        projectId,
        version: 1,
        executorId: "codebuddy",
        description: builtinDisplay(role.description),
        prompt: fallbackRolePrompt(role),
        artifactOutputs: [
          {
            name: role.artifactId,
            path: role.artifactPath,
            mediaType: "text/markdown",
            required: true,
          },
        ],
      },
      "PUT",
    );
  }

  const nodes = FALLBACK_NODES.map((node, index) => ({
    id: node.id,
    name: builtinDisplay(node.name),
    type: "agent",
    agentId: agentIdMap[node.agentId] || node.agentId,
    metricStage: node.metricStage || "development",
    maxAttempts: 1,
    maxReworks: 1,
    position: { x: 80 + index * 220, y: 200 },
    artifactOutputs: [
      {
        name: `${node.id}-report`,
        path: `${node.id}-report.md`,
        mediaType: "text/markdown",
        required: true,
      },
    ],
  }));

  const edges = nodes.slice(1).map((node, index) => ({
    id: `e-${nodes[index].id}-${node.id}`,
    source: nodes[index].id,
    target: node.id,
    when: "success",
  }));

  const draft = await write(
    "/api/workflows",
    {
      id: workflowId,
      name: builtinDisplay("后端交付 SOP"),
      projectId,
      owner,
      status: "draft",
      version: 1,
      revision: 0,
      sopLane: "backend",
      sandboxProfileId: sandboxId,
      tags: [chatT("快速接入", "Kết nối nhanh"), `generic-source:${DEFAULT_SOP_ID}`],
      description: chatT(
        "从需求定型、方案设计、代码实现、独立评审、测试验证到发起 MR 的标准交付流程。",
        "Quy trình bàn giao tiêu chuẩn từ định hình yêu cầu, thiết kế giải pháp, triển khai mã, rà soát độc lập và kiểm thử xác minh đến mở MR.",
      ),
      nodes,
      edges,
    },
    "PUT",
  );
  return write(
    `/api/workflows/${encodeURIComponent(draft.id)}/publish`,
    {},
  ).catch(() => draft);
}

export default function QuickAccessWizard({
  open,
  user,
  projects = [],
  projectId = "",
  sponsoredModel = "",
  sponsoredModels = [],
  onClose,
  onCompleted,
  onCredentialsSaved,
  onOpenView,
}) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("wizard");
  const [credentialUser, setCredentialUser] = useState(null);
  const storedUser = credentialUser?.id === user?.id ? credentialUser || user : user;
  const { id: userId, loginName, chineseName, isPlatformAdmin, platformRole, isGuest } = user || {};
  const [credentialsPending, setCredentialsPending] = useState(false);
  const [gitHttpHosts, setGitHttpHosts] = useState([]);
  const [gongfengHost, setGongfengHost] = useState("");
  const [sshCredentials, setSSHCredentials] = useState({ userId: null, keys: null, error: false });
  const [catalogProjects, setCatalogProjects] = useState(projects);
  const [repositories, setRepositories] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [projectAgents, setProjectAgents] = useState([]);
  const [templateAgents, setTemplateAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [verifyingGit, setVerifyingGit] = useState(false);
  const [gitVerify, setGitVerify] = useState(null);
  const [projectMode, setProjectMode] = useState("existing");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newProjectKey, setNewProjectKey] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [keyTouched, setKeyTouched] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [bindRepoNow, setBindRepoNow] = useState(true);
  const [makeDefaultRepo, setMakeDefaultRepo] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] =
    useState(DEFAULT_SOP_ID);
  const [previewTab, setPreviewTab] = useState("stages");
  const [completedSummary, setCompletedSummary] = useState(null);
  const [direction, setDirection] = useState("forward");
  const [stepAnimated, setStepAnimated] = useState(false);
  const headingRef = useRef(null);
  const bodyRef = useRef(null);
  const presence = usePanelPresence(open, 300);
  const reopenedWhileClosing = presence.phase === "closing";

  const editableProjects = useMemo(
    () =>
      (catalogProjects || []).filter((project) =>
        canChatInProject(project, storedUser || user),
      ),
    [catalogProjects, storedUser, user],
  );

  const projectSelectOptions = useMemo(
    () =>
      editableProjects.map((project) => ({
        value: project.id,
        label: project.name,
        hint: project.key || project.id,
      })),
    [editableProjects],
  );

  const genericWorkflows = useMemo(() => {
    const rows = (workflows || []).filter((workflow) => workflow.generic);
    return rows.length
      ? rows
      : [
          {
            id: DEFAULT_SOP_ID,
            name: "通用后端交付 SOP",
            description:
              "从需求定型、方案设计、代码实现、独立评审、测试验证到发起 MR 的标准交付链路。",
            generic: true,
            nodes: FALLBACK_NODES,
          },
        ];
  }, [workflows]);

  const currentProject = useMemo(
    () =>
      editableProjects.find((project) => project.id === selectedProjectId) ||
      editableProjects[0] ||
      null,
    [editableProjects, selectedProjectId],
  );

  // A member can work in a shared project (e.g. the welcome project) without
  // owning it; binding a repository there would only fail at the last step.
  const repoBindBlocked =
    projectMode === "existing" &&
    Boolean(currentProject) &&
    !canManageProjectRepos(currentProject, storedUser || user);

  const projectRepos = useMemo(
    () =>
      currentProject
        ? (repositories || []).filter(
            (repo) => repo.projectId === currentProject.id,
          )
        : [],
    [currentProject, repositories],
  );

  const defaultRepo = useMemo(() => {
    if (!currentProject) return null;
    return (
      projectRepos.find(
        (repo) => repo.id === currentProject.defaultRepositoryId,
      ) ||
      projectRepos[0] ||
      null
    );
  }, [currentProject, projectRepos]);

  const availableWorkflows = useMemo(() => {
    const projectIdTarget =
      projectMode === "existing" ? currentProject?.id : "";
    const ownedOrShared = (workflows || []).filter(
      (workflow) =>
        !workflow.generic &&
        ((projectIdTarget && workflow.projectId === projectIdTarget) ||
          workflow.shared),
    );
    const seen = new Set(ownedOrShared.map((item) => item.id));
    const merged = [...ownedOrShared];
    for (const generic of genericWorkflows) {
      if (!seen.has(generic.id)) merged.push(generic);
    }
    return merged;
  }, [workflows, genericWorkflows, projectMode, currentProject]);

  const sopSelectOptions = useMemo(
    () =>
      availableWorkflows.map((workflow) => {
        const stageCount = (workflow.nodes || FALLBACK_NODES).filter(
          (n) => n.type === "agent",
        ).length;
        const scopeLabel = workflow.generic
          ? chatT("平台默认模板", "Mẫu mặc định nền tảng")
          : projectMode === "existing" &&
              workflow.projectId === currentProject?.id
            ? chatT("本项目已有 SOP（直接复用）", "SOP hiện có của dự án (dùng lại trực tiếp)")
            : chatT("共享 SOP", "SOP dùng chung");
        return {
          value: workflow.id,
          label: workflow.name,
          hint: chatT(`${stageCount} 个阶段 · ${scopeLabel}`, `${stageCount} giai đoạn · ${scopeLabel}`),
        };
      }),
    [availableWorkflows, currentProject, projectMode],
  );

  const activeWorkflow = useMemo(
    () =>
      availableWorkflows.find(
        (workflow) => workflow.id === selectedWorkflowId,
      ) || availableWorkflows[0],
    [availableWorkflows, selectedWorkflowId],
  );

  const parsedRepo = useMemo(() => parseGongfengRepo(repoUrl, gongfengHost), [repoUrl, gongfengHost]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    api("/api/auth/gongfeng").then(status => {
      if (current) setGongfengHost(status?.host || "");
    }).catch(() => {});
    return () => { current = false; };
  }, [open]);

  // Reopening during the exit transition reverses it onto the same content.
  useEffect(() => {
    if (!open || reopenedWhileClosing) return;
    setStep(0);
    setDirection("forward");
    setStepAnimated(false);
    setPhase("wizard");
    setError("");
    setGitToken("");
    setGitVerify(null);
    setCredentialUser(null);
    setCredentialsPending(false);
    setGitHttpHosts([]);
    setCompletedSummary(null);
    setBindRepoNow(true);
    setPreviewTab("stages");
    setIdTouched(false);
    setKeyTouched(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [projectsRes, reposRes, workflowsRes, agentsRes] =
          await Promise.all([
            api("/api/projects").catch(() => projects),
            api("/api/repositories").catch(() => []),
            api("/api/workflows").catch(() => []),
            api("/api/agents").catch(() => []),
          ]);
        if (!active) return;
        const nextProjects = Array.isArray(projectsRes)
          ? projectsRes
          : projects;
        setCatalogProjects(nextProjects);
        setRepositories(Array.isArray(reposRes) ? reposRes : []);
        const nextWorkflows = Array.isArray(workflowsRes) ? workflowsRes : [];
        setWorkflows(nextWorkflows);
        setProjectAgents(Array.isArray(agentsRes) ? agentsRes : []);
        const actor = userId == null ? null : { id: userId, isPlatformAdmin, platformRole };
        const mine = nextProjects.filter((project) => canChatInProject(project, actor));
        const preferred =
          mine.find((project) => project.id === projectId) || mine[0] || null;
        if (preferred) {
          setProjectMode("existing");
          setSelectedProjectId(preferred.id);
          const ownedSop = nextWorkflows.find(
            (w) =>
              !w.generic &&
              w.projectId === preferred.id &&
              (w.id === preferred.workflowId || w.status === "published"),
          );
          if (ownedSop) setSelectedWorkflowId(ownedSop.id);
          else if (preferred.workflowId)
            setSelectedWorkflowId(preferred.workflowId);
        } else {
          setProjectMode("create");
          const login = loginName || "team";
          const suggestedName = chatT(`${chineseName || login} 的项目`, `Dự án của ${chineseName || login}`);
          setNewProjectName(suggestedName);
          setNewProjectId(slugifyProjectId(`${login}-project`) || "my-project");
          setNewProjectKey(deriveProjectKey(login));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [open, projectId, projects, userId, loginName, chineseName, isPlatformAdmin, platformRole]);

  useEffect(() => {
    if (!open || !userId || isGuest) return undefined;
    let active = true;
    let generation = 0;
    const refresh = () => {
      const version = ++generation;
      const current = () => active && version === generation;
      api("/api/users")
        .then(async rows => {
          const fresh = rows?.find(item => Number(item.id) === Number(userId));
          if (!current() || !fresh) return;
          setCredentialUser(fresh);
          const http = fresh.gitHttpCredentialsConfigured
            ? await api(`/api/users/${encodeURIComponent(userId)}/git-http-credentials`).catch(() => [])
            : [];
          if (current()) setGitHttpHosts(http.map(item => item.host));
        })
        .catch(() => {})
        .finally(() => { if (current()) setCredentialsPending(false); });
      api(`/api/users/${encodeURIComponent(userId)}/git-ssh-keys`)
        .then((keys) => {
          if (current()) setSSHCredentials({ userId, keys: Array.isArray(keys) ? keys : [], error: false });
        })
        .catch(() => {
          if (current()) setSSHCredentials({ userId, keys: [], error: true });
        });
    };
    const credentialsChanged = (event) => {
      if (event.source !== window.parent || event.origin !== location.origin) return;
      if (event.data?.type === "agentflow-chat-resume-quick-access") {
        headingRef.current?.focus({ preventScroll: true });
        refresh();
        return;
      }
      if (event.data?.type !== "agentflow-credentials-changed") return;
      setCredentialsPending(true);
      setError(previous => previous === CREDENTIALS_REQUIRED ? "" : previous);
      refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("message", credentialsChanged);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("message", credentialsChanged);
    };
  }, [open, userId, isGuest]);

  useEffect(() => {
    if (!open || !selectedWorkflowId) return undefined;
    // Only platform templates have template roles; a project SOP would 404.
    const known = (workflows || []).find((w) => w.id === selectedWorkflowId);
    if (known && !known.generic) {
      setTemplateAgents([]);
      return undefined;
    }
    let active = true;
    api(`/api/workflows/${encodeURIComponent(selectedWorkflowId)}/agents`)
      .then((rows) => {
        if (active && Array.isArray(rows) && rows.length)
          setTemplateAgents(rows);
      })
      .catch(() => {
        if (active) setTemplateAgents([]);
      });
    return () => {
      active = false;
    };
  }, [open, selectedWorkflowId, workflows]);

  useEffect(() => {
    if (!open) return;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
  }, [open, step, phase]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving && !verifyingGit && !closeActiveSelect) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, verifyingGit, onClose]);

  useEffect(() => {
    if (projectMode !== "create" || !parsedRepo) return;
    if (!newProjectName.trim()) setNewProjectName(parsedRepo.name);
    if (!idTouched)
      setNewProjectId(slugifyProjectId(parsedRepo.name) || "my-project");
    if (!keyTouched) setNewProjectKey(deriveProjectKey(parsedRepo.name));
  }, [parsedRepo, projectMode, newProjectName, idTouched, keyTouched]);

  useEffect(() => {
    if (!open || projectMode !== "existing" || !currentProject) return;
    const ownedSop = (workflows || []).find(
      (w) =>
        !w.generic &&
        w.projectId === currentProject.id &&
        (w.id === currentProject.workflowId || w.status === "published"),
    );
    if (ownedSop) setSelectedWorkflowId(ownedSop.id);
    else if (currentProject.workflowId)
      setSelectedWorkflowId(currentProject.workflowId);
    else setSelectedWorkflowId(DEFAULT_SOP_ID);
  }, [open, projectMode, currentProject?.id]);

  // A new project starts from the platform template; the SOP picked for the
  // previously selected project belongs to that project and is not offered.
  useEffect(() => {
    if (open && projectMode === "create") setSelectedWorkflowId(DEFAULT_SOP_ID);
  }, [open, projectMode]);

  const roles = useMemo(() => {
    if (activeWorkflow && !activeWorkflow.generic) {
      const boundIds = new Set(
        (activeWorkflow.nodes || []).map((n) => n.agentId).filter(Boolean),
      );
      const matched = (projectAgents || []).filter(
        (a) =>
          boundIds.has(a.id) ||
          a.projectId === (activeWorkflow.projectId || currentProject?.id),
      );
      if (matched.length) return matched;
    }
    return templateAgents.length ? templateAgents : FALLBACK_ROLES;
  }, [activeWorkflow, projectAgents, currentProject?.id, templateAgents]);

  if (!presence.mounted) return null;

  const closing = presence.phase === "closing";
  const activeStepIndex = phase === "success" ? STEPS.length - 1 : step;
  const activeStep = STEPS[activeStepIndex] || STEPS[0];
  const wizardStepCount = STEPS.length - 1;
  const gitHubReady = Boolean(storedUser?.gitHubCredentialConfigured);
  const gongfengReady = Boolean(storedUser?.gitTokenOAuth);
  const hasGit = gitHubReady || gongfengReady || Boolean(storedUser?.gitSshKeyConfigured || storedUser?.gitHttpCredentialsConfigured);
  const sshKeysLoaded = sshCredentials.userId === user?.id && sshCredentials.keys !== null;
  const hasSSHKey = (remote) => sshKeysLoaded && !sshCredentials.error && sshCredentials.keys.some(
    (key) => globalThis.LoopForgeGitSSHHost(key.host) === remote?.host,
  );
  const gitAccess = (repo) => {
    if (repo?.provider === "ssh") return { label: "Git SSH", ready: hasSSHKey(repo) };
    if (repo?.provider === "https") return { label: "Git HTTPS", ready: gitHttpHosts.includes(repo.host) };
    if (repo?.provider === "github") return { label: "GitHub", ready: gitHubReady };
    if (repo?.provider === "gongfeng") return { label: chatT("工蜂", "Gongfeng"), ready: gongfengReady };
    return { label: "Git", ready: hasGit };
  };
  const selectedRepo = (bindRepoNow && parsedRepo) || parseGongfengRepo(defaultRepo?.cloneUrl, gongfengHost);
  const repoAccess = gitAccess(selectedRepo);
  const readyCLIs = EXECUTORS.filter(cli => personalEngineConfigured(storedUser, cli.id));
  const cliReady = readyCLIs.length > 0 || Boolean(sponsoredModel);
  const nodes =
    activeWorkflow?.nodes?.filter((node) => node.type === "agent") ||
    FALLBACK_NODES;

  function goToStep(next) {
    setDirection(next < step ? "back" : "forward");
    setStepAnimated(true);
    setStep(next);
  }

  async function verifyGit() {
    if (!userId || verifyingGit) return false;
    const secret = gitToken.trim();
    const userPath = `/api/users/${encodeURIComponent(userId)}`;
    setVerifyingGit(true);
    setGitVerify(null);
    setError("");
    try {
      const result = secret
        ? await write(`${userPath}/git-token/verify`, { token: secret })
        : await api(`${userPath}/git-token/verify`);
      if (result.valid && secret) {
        const endpoint = `${userPath}/git-http-credentials`;
        const credentials = await api(endpoint);
        const existing = credentials.find(credential => credential.host === "github.com");
        await write(endpoint, {
          ...(existing ? { id: existing.id } : {}),
          host: "github.com", platform: "github", name: "GitHub", username: "x-access-token", token: secret,
        }, "PUT");
        setCredentialUser({ ...storedUser, id: userId, gitHubCredentialConfigured: true, gitHttpCredentialsConfigured: true });
        setGitToken("");
        onCredentialsSaved?.();
        if (window.parent !== window) {
          window.parent.postMessage({ type: "agentflow-credentials-changed" }, location.origin);
        }
      }
      setGitVerify(result);
      return result.valid;
    } catch (failure) {
      setGitVerify({ valid: false, error: failure.message });
      return false;
    } finally {
      setVerifyingGit(false);
    }
  }

  async function nextStep() {
    if (saving || verifyingGit) return;
    setError("");
    if (activeStep.id === "auth") {
      if (gitToken.trim()) {
        if (!(await verifyGit())) {
          setError(chatT("GitHub 令牌未保存，请检查校验结果。", "Token GitHub chưa lưu; kiểm tra kết quả xác minh."));
          return;
        }
      } else if (!hasGit && !cliReady) {
        setError(CREDENTIALS_REQUIRED);
        return;
      }
      goToStep(1);
      return;
    }
    if (activeStep.id === "project") {
      if (projectMode === "create") {
        const id = slugifyProjectId(newProjectId || newProjectName);
        if (!id || !newProjectName.trim()) {
          setError(chatT("请填写项目名称和项目标识。", "Vui lòng điền tên và định danh dự án."));
          return;
        }
        // Saving a project with an existing id replaces it (members, TAPD
        // settings), so "new project" must never land on an existing one.
        if (catalogProjects.some((item) => item.id === id)) {
          setError(
            chatT(`项目标识「${id}」已被现有项目使用。请换一个标识，或切换到「选择已有项目」。`, `Định danh dự án “${id}” đã được dùng. Dùng định danh khác hoặc chuyển sang “Chọn dự án hiện có”.`),
          );
          return;
        }
      } else if (!currentProject) {
        setError(chatT("请选择一个项目，或切换到新建项目。", "Chọn một dự án hoặc chuyển sang tạo dự án mới."));
        return;
      }
      if (bindRepoNow && repoUrl.trim() && repoBindBlocked) {
        setError(
          chatT(`你不是「${currentProject?.name || "该项目"}」的 Owner，不能为它绑定仓库。请新建自己的项目并绑定，或关闭「绑定仓库」继续体验。`, `Bạn không phải chủ sở hữu của “${currentProject?.name || "dự án này"}”, nên không thể liên kết kho mã. Tạo dự án riêng và liên kết, hoặc tắt “Liên kết kho mã” để tiếp tục trải nghiệm.`),
        );
        return;
      }
      if (bindRepoNow && repoUrl.trim() && !parsedRepo) {
        setError(
          chatT("请输入 Git HTTPS 仓库链接或 Git SSH 克隆地址。", "Nhập liên kết kho Git HTTPS hoặc địa chỉ clone Git SSH."),
        );
        return;
      }
      goToStep(2);
      return;
    }
    if (activeStep.id === "workflow") {
      await finishSetup();
    }
  }

  async function finishSetup() {
    setSaving(true);
    setError("");
    try {
      let targetProject = currentProject;
      // Save the SOP the page shows; a stale id hidden by the current
      // filter must never be bound to the project.
      const sopId = activeWorkflow?.id || DEFAULT_SOP_ID;
      if (projectMode === "create") {
        const id = slugifyProjectId(newProjectId || newProjectName);
        const key = deriveProjectKey(newProjectKey || id);
        if (catalogProjects.some((item) => item.id === id))
          throw new Error(
            chatT(`项目标识「${id}」已被现有项目使用，请换一个标识。`, `Định danh dự án “${id}” đã được dùng; chọn định danh khác.`),
          );
        targetProject = await write(
          "/api/projects",
          {
            id,
            key,
            name: newProjectName.trim(),
            description: "",
            color: "#536dfe",
            ownerId: Number(user?.id) || 0,
            workflowId: sopId,
            members: [],
          },
          "POST",
        );
      } else if (
        targetProject &&
        targetProject.workflowId !== sopId &&
        Number(targetProject.ownerId) === Number(user?.id)
      ) {
        targetProject = await write(
          "/api/projects",
          { ...targetProject, workflowId: sopId },
          "PUT",
        );
      }

      let boundRepo = defaultRepo;
      if (bindRepoNow && parsedRepo && targetProject?.id && !repoBindBlocked) {
        const existingRepo = (repositories || []).find(
          (repo) =>
            repo.projectId === targetProject.id &&
            (["ssh", "https"].includes(parsedRepo.provider)
              ? repo.cloneUrl === parsedRepo.cloneUrl
              : repo.gongfengProjectId === parsedRepo.project ||
                repo.webUrl === parsedRepo.webUrl),
        );
        if (existingRepo) {
          boundRepo = await write(
            "/api/repositories",
            {
              ...existingRepo,
              provider: parsedRepo.provider,
              name: parsedRepo.name,
              gongfengProjectId: parsedRepo.project,
              webUrl: parsedRepo.webUrl || existingRepo.webUrl,
              cloneUrl: parsedRepo.cloneUrl,
              defaultBranch: repoBranch.trim() || "main",
              repoUrl: repoUrl.trim(),
            },
            "PUT",
          );
        } else {
          boundRepo = await write("/api/repositories", {
            projectId: targetProject.id,
            provider: parsedRepo.provider || "gongfeng",
            name: parsedRepo.name,
            gongfengProjectId: parsedRepo.project,
            webUrl: parsedRepo.webUrl,
            cloneUrl: parsedRepo.cloneUrl,
            defaultBranch: repoBranch.trim() || "main",
            repoUrl: repoUrl.trim(),
          });
        }
      }

      let provisionedWorkflow = activeWorkflow;
      if (targetProject?.id) {
        const selectedConcrete = (workflows || []).find(
          (item) => item.id === sopId && !item.generic,
        );
        const existingProjectSop =
          selectedConcrete ||
          (workflows || []).find(
            (item) =>
              !item.generic &&
              item.projectId === targetProject.id &&
              ((item.tags || []).includes(`generic-source:${sopId}`) ||
                item.id === `${sopId}-${targetProject.id}` ||
                item.name === (activeWorkflow?.name || "通用后端交付 SOP")),
          );
        if (existingProjectSop) {
          provisionedWorkflow = existingProjectSop;
        } else {
          const hasStoredGeneric = (workflows || []).some(
            (item) => item.id === sopId && item.generic,
          );
          const cloneId = `${sopId}-${targetProject.id}`.slice(0, 60);
          const ownerName =
            user?.chineseName || user?.loginName || "平台";
          if (hasStoredGeneric) {
            try {
              const cloned = await write(
                `/api/workflows/${encodeURIComponent(sopId)}/clone`,
                {
                  id: cloneId,
                  name: (activeWorkflow?.name || "通用后端交付 SOP").replace(
                    /^通用/,
                    "",
                  ),
                  owner: ownerName,
                  projectId: targetProject.id,
                },
              );
              provisionedWorkflow = await write(
                `/api/workflows/${encodeURIComponent(cloned.id)}/publish`,
                {},
              ).catch(() => cloned);
            } catch {
              provisionedWorkflow = await provisionFallbackProjectSOP(
                targetProject.id,
                cloneId,
                ownerName,
              );
            }
          } else {
            provisionedWorkflow = await provisionFallbackProjectSOP(
              targetProject.id,
              cloneId,
              ownerName,
            );
          }
        }

        if (
          Number(targetProject.ownerId) === Number(user?.id) &&
          (boundRepo?.id || provisionedWorkflow?.id)
        ) {
          const nextDefaultRepoId =
            boundRepo?.id &&
            (projectMode === "create" ||
              !targetProject.defaultRepositoryId ||
              makeDefaultRepo)
              ? boundRepo.id
              : targetProject.defaultRepositoryId || "";
          targetProject = await write(
            "/api/projects",
            {
              ...targetProject,
              workflowId:
                provisionedWorkflow?.id || targetProject.workflowId || sopId,
              defaultRepositoryId: nextDefaultRepoId,
            },
            "PUT",
          );
        }
      }

      window.parent !== window &&
        window.parent.postMessage(
          {
            type: "agentflow-quick-access-completed",
            projectId: targetProject?.id || "",
          },
          location.origin,
        );

      setCompletedSummary({
        project: targetProject,
        repository: boundRepo,
        workflow: provisionedWorkflow || activeWorkflow,
        roles: roles.map(({ id, name }) => ({ id, name })),
        gitAccess: gitAccess(parseGongfengRepo(boundRepo?.cloneUrl, gongfengHost)),
        cliNames: EXECUTORS.filter(cli => personalEngineConfigured(storedUser, cli.id)).map(cli => cli.label),
      });
      setPhase("success");
      await onCompleted?.(targetProject?.id || "");
    } catch (err) {
      setError(err.message || chatT("保存快速接入配置失败", "Lưu cấu hình kết nối nhanh thất bại"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="qa-backdrop"
      role="presentation"
      data-phase={presence.phase}
      inert={closing}
      aria-hidden={closing || undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving && !verifyingGit && !closing)
          onClose?.();
      }}
    >
      <div
        className="qa-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qa-wizard-title"
      >
        <aside className="qa-rail" aria-label={chatT("快速接入步骤", "Các bước kết nối nhanh")}>
          <div className="qa-rail-head">
            <div className="qa-brand-mark">
              <HarnessIcon name="sparkles" size={20} />
            </div>
            <h2 id="qa-wizard-title">{chatT("快速接入", "Kết nối nhanh")}</h2>
            <p>{chatT("提供最低限度的鉴权与仓库，直接使用默认角色和 SOP。", "Cung cấp xác thực và kho mã tối thiểu để dùng ngay vai trò và SOP mặc định.")}</p>
          </div>
          <ol className="qa-steps">
            {STEPS.map((item, index) => {
              const done = index < activeStepIndex;
              const current = index === activeStepIndex;
              return (
                <li
                  key={item.id}
                  className={[
                    "qa-step",
                    done && "is-done",
                    current && "is-active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={current ? "step" : undefined}
                >
                  <div className="qa-step-mark">
                    <span
                      className="qa-step-no"
                      aria-hidden={done || undefined}
                    >
                      {item.id === "done" ? (
                        <HarnessIcon name="flag" size={13} interactive={false} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="qa-step-check" aria-hidden="true">
                      <HarnessIcon name="check" size={13} interactive={false} />
                    </span>
                  </div>
                  <div className="qa-step-copy">
                    <div className="qa-step-title">{item.title}</div>
                    <div className="qa-step-desc">{item.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="qa-rail-foot">{chatT("所有配置之后都能在个人配置与项目配置里修改。", "Có thể sửa mọi cấu hình sau này trong Cài đặt cá nhân và Cài đặt dự án.")}</p>
        </aside>

        <div className="qa-main">
          <button
            type="button"
            className="qa-close"
            aria-label={chatT("关闭快速接入", "Đóng kết nối nhanh")}
            disabled={saving || verifyingGit}
            onClick={onClose}
          >
            <HarnessIcon name="close" size={16} />
          </button>

          {phase === "success" ? (
            <>
              <div ref={bodyRef} className="qa-body">
                <div className="qa-success">
                  <div className="qa-success-head">
                    <div className="qa-success-mark" aria-hidden="true">
                      <svg viewBox="0 0 48 48" width="52" height="52">
                        <circle
                          className="qa-success-ring"
                          cx="24"
                          cy="24"
                          r="22"
                          pathLength="1"
                        />
                        <path
                          className="qa-success-tick"
                          d="M15 24.5l6 6 12-13"
                          pathLength="1"
                        />
                      </svg>
                    </div>
                    <h3
                      ref={headingRef}
                      tabIndex={-1}
                      className="qa-title qa-success-item"
                      style={{ "--i": 0 }}
                    >
                      {chatT("快速接入已完成", "Đã hoàn tất kết nối nhanh")}
                    </h3>
                    <p className="qa-lede qa-success-item" style={{ "--i": 1 }}>
                      {chatT(`已关联默认角色与「${builtinDisplay(completedSummary?.workflow?.name || "通用后端交付 SOP")}」，现在可以直接在工作台对话或派发需求。`, `Đã liên kết vai trò mặc định và “${builtinDisplay(completedSummary?.workflow?.name || "通用后端交付 SOP")}”; có thể trực tiếp trò chuyện hoặc điều phối yêu cầu trong bàn làm việc.`)}
                    </p>
                  </div>

                  <div className="qa-success-grid">
                    <section
                      className="qa-card qa-success-item"
                      style={{ "--i": 2 }}
                    >
                      <div className="qa-card-title">{chatT("默认角色与流程", "Vai trò và quy trình mặc định")}</div>
                      <ul className="qa-role-list">
                        {(completedSummary?.roles || []).map((role) => (
                          <li key={role.id}>
                            <span className="qa-avatar">
                              {(builtinDisplay(role.name) || chatT("角", "V")).slice(0, 1)}
                            </span>
                            <span>{builtinDisplay(role.name)}</span>
                            <small>{chatT("默认角色", "Vai trò mặc định")}</small>
                          </li>
                        ))}
                        <li>
                          <span className="qa-avatar is-flow">
                            <HarnessIcon name="workflow" size={13} />
                          </span>
                          <span>
                            {builtinDisplay(completedSummary?.workflow?.name || "通用后端交付 SOP")}
                          </span>
                          <small>{chatT("已绑定", "Đã liên kết")}</small>
                        </li>
                      </ul>
                    </section>

                    <section
                      className="qa-card qa-success-item"
                      style={{ "--i": 3 }}
                    >
                      <div className="qa-card-title">{chatT("已生效配置", "Cấu hình đã có hiệu lực")}</div>
                      <ul className="qa-status-list">
                        <li
                          className={
                            completedSummary?.gitAccess.ready ? "is-ok" : "is-warn"
                          }
                        >
                          <HarnessIcon
                            name={completedSummary?.gitAccess.ready ? "check" : "info"}
                            size={14}
                          />
                          <span>
                            {completedSummary?.gitAccess.label || "Git"} {chatT("访问：", "truy cập:")}
                            {completedSummary?.gitAccess.ready
                              ? chatT("已就绪", "Đã sẵn sàng")
                              : chatT("未配置，克隆/推送私有仓库前可在个人配置补齐", "Chưa cấu hình; có thể bổ sung trong Cài đặt cá nhân trước khi clone/push kho riêng")}
                          </span>
                        </li>
                        <li className={completedSummary?.cliNames?.length || sponsoredModel ? "is-ok" : "is-warn"}>
                          <HarnessIcon name={completedSummary?.cliNames?.length ? "check" : "info"} size={14} />
                          <span>
                            {chatT("模型 CLI ·", "CLI mô hình ·")} {completedSummary?.cliNames?.join(quickAccessListSeparator()) ||
                              (sponsoredModel
                                ? chatT(`平台共享模型（${sharedModelNames(sponsoredModels, sponsoredModel)}）`, `Mô hình dùng chung nền tảng (${sharedModelNames(sponsoredModels, sponsoredModel)})`)
                                : chatT("可在个人配置或执行机器设置中准备", "Có thể thiết lập trong Cài đặt cá nhân hoặc cài đặt máy thực thi"))}
                          </span>
                        </li>
                        <li className="is-ok">
                          <HarnessIcon name="check" size={14} />
                          <span>
                            {chatT("项目：", "Dự án:")}
                            {completedSummary?.project?.name || chatT("当前项目", "Dự án hiện tại")}
                            {completedSummary?.repository?.name
                              ? chatT(` · 仓库 ${completedSummary.repository.name}`, ` · Kho mã ${completedSummary.repository.name}`)
                              : chatT(" · 仓库可在运行时指定", " · Có thể chỉ định kho mã khi chạy")}
                          </span>
                        </li>
                      </ul>
                    </section>

                    <button
                      type="button"
                      className="qa-action is-primary qa-success-item"
                      style={{ "--i": 4 }}
                      onClick={() => onClose?.()}
                    >
                      <span className="qa-action-icon">
                        <HarnessIcon name="play" size={16} />
                      </span>
                      <span className="qa-action-copy">
                        <strong>{chatT("开始第一条需求", "Bắt đầu yêu cầu đầu tiên")}</strong>
                        <small>
                          {chatT("回到工作台输入框，直接描述要做的需求或问题", "Quay lại ô nhập bàn làm việc và mô tả trực tiếp yêu cầu hoặc vấn đề cần xử lý")}
                        </small>
                      </span>
                      <HarnessIcon
                        name="chevron-right"
                        size={16}
                        className="qa-action-chevron"
                      />
                    </button>
                    <button
                      type="button"
                      className="qa-action qa-success-item"
                      style={{ "--i": 5 }}
                      data-hover-ink-control=""
                      onClick={() => {
                        onClose?.();
                        onOpenView?.("sops");
                      }}
                    >
                      <span className="qa-action-icon">
                        <HarnessIcon name="workflow" size={16} />
                      </span>
                      <span className="qa-action-copy">
                        <strong>{chatT("查看或修改 SOP", "Xem hoặc sửa SOP")}</strong>
                        <small>
                          {chatT("在流程模板里查看默认 SOP，或复制到项目自由调整", "Xem SOP mặc định trong mẫu quy trình hoặc sao chép vào dự án để tùy chỉnh")}
                        </small>
                      </span>
                      <HarnessIcon
                        name="chevron-right"
                        size={16}
                        className="qa-action-chevron"
                      />
                    </button>
                  </div>
                </div>
              </div>
              <footer className="qa-footer">
                <div className="qa-footer-spacer" />
                <button
                  type="button"
                  className="qa-btn qa-btn-ghost"
                  data-hover-ink-control=""
                  onClick={onClose}
                >
                  {chatT("关闭", "Đóng")}
                </button>
              </footer>
            </>
          ) : (
            <>
              <div ref={bodyRef} className="qa-body">
                <div
                  key={activeStep.id}
                  className={`qa-stage ${stepAnimated ? "is-entering" : ""}`}
                  data-direction={direction}
                >
                  <header className="qa-stage-heading">
                    <div className="qa-kicker">
                      <span className="qa-kicker-name" aria-hidden="true">{chatT("快速接入", "Kết nối nhanh")}</span>
                      {chatT(`第 ${activeStepIndex + 1} 步，共 ${wizardStepCount} 步`, `Bước ${activeStepIndex + 1}/${wizardStepCount}`)}
                    </div>
                    <h3 ref={headingRef} tabIndex={-1} className="qa-title">
                      {activeStep.title}
                    </h3>
                    {activeStep.id === "auth" ? (
                      <p className="qa-lede">
                        {hasGit || readyCLIs.length
                          ? chatT("可以继续选择项目和仓库，也可以先补齐下面的配置。", "Có thể tiếp tục chọn dự án và kho mã hoặc hoàn tất cấu hình bên dưới trước.")
                          : sponsoredModel
                            ? chatT("平台共享模型可用，可直接继续。需要操作私有仓库时，可以在这里添加 Git 凭据。", "Mô hình dùng chung của nền tảng khả dụng, có thể tiếp tục ngay. Khi cần thao tác kho riêng, thêm thông tin xác thực Git tại đây.")
                            : chatT("配置任意一项即可继续。下一步选择项目和仓库。", "Cấu hình một mục bất kỳ để tiếp tục. Bước tiếp theo chọn dự án và kho mã.")}
                      </p>
                    ) : null}
                  </header>

                  {error ? (
                    <p key={error} className="qa-note is-err" role="alert">
                      <HarnessIcon name="info" size={14} interactive={false} />
                      <span>{error}</span>
                    </p>
                  ) : null}

                  {activeStep.id === "auth" ? (
                    <div className="qa-pane">
                      <section className="qa-cred-card" aria-labelledby="qa-github-title">
                        <header className="qa-cred-head">
                          <div>
                            <strong id="qa-github-title">{chatT("GitHub 代码仓库授权", "Cấp quyền kho mã GitHub")}</strong>
                            <span>{chatT("用于克隆私有仓库、创建分支、推送代码与发起 PR", "Dùng clone kho riêng, tạo nhánh, push mã và mở PR")}</span>
                          </div>
                          <StatusPill ok={gitHubReady} />
                        </header>
                        <div className="qa-cred-body">
                          <button type="button" className="qa-btn qa-btn-primary qa-btn-sm" disabled={verifyingGit} onClick={() => openCredentialSettings("gitToken")}>
                            {gitHubReady ? chatT("管理 GitHub 授权", "Quản lý quyền GitHub") : chatT("连接 GitHub", "Kết nối GitHub")}
                          </button>
                          <p className="qa-hint">{chatT("在个人配置中完成授权，返回后继续。", "Hoàn tất cấp quyền trong Cài đặt cá nhân, rồi quay lại tiếp tục.")}</p>
                          <p className="qa-hint">{chatT("GitLab 等 SSH 仓库：", "Kho SSH như GitLab:")}<button type="button" className="qa-link-btn" disabled={verifyingGit} onClick={() => openCredentialSettings("gitSshKey")}>{storedUser?.gitSshKeyConfigured ? chatT("管理 Git SSH 密钥", "Quản lý khóa Git SSH") : chatT("配置 Git SSH 密钥", "Cấu hình khóa Git SSH")}</button></p>
                          <p className="qa-hint">{chatT("GitLab、GitHub Enterprise 等 HTTPS 主机：", "Host HTTPS như GitLab, GitHub Enterprise:")}<button type="button" className="qa-link-btn" disabled={verifyingGit} onClick={() => openCredentialSettings("gitHttpCredentials")}>{storedUser?.gitHttpCredentialsConfigured ? chatT("管理 Git 访问令牌", "Quản lý token truy cập Git") : chatT("配置 Git 访问令牌", "Cấu hình token truy cập Git")}</button></p>
                          <details>
                            <summary>{chatT("使用访问令牌（高级）", "Dùng token truy cập (nâng cao)")}</summary>
                            <div className="qa-input-row">
                              <input
                                type="password"
                                className="qa-input"
                                value={gitToken}
                                onChange={(event) => { setGitToken(event.target.value); setGitVerify(null); }}
                                placeholder={gitHubReady ? chatT("已配置，留空保持不变", "Đã cấu hình; để trống để giữ nguyên") : chatT("GitHub 个人访问令牌（PAT）", "Token truy cập cá nhân GitHub (PAT)")}
                                aria-label={chatT("GitHub 个人访问令牌", "Token truy cập cá nhân GitHub")}
                                autoComplete="new-password"
                                disabled={verifyingGit}
                              />
                              <button type="button" className="qa-btn qa-btn-outline qa-btn-sm qa-btn-field" data-hover-ink-control="" disabled={!userId || verifyingGit || (!gitToken.trim() && !gitHubReady)} aria-busy={verifyingGit || undefined} onClick={verifyGit}>
                                <BusyLabel busy={verifyingGit} busyLabel={chatT("校验中…", "Đang xác minh…")}>{chatT("校验", "Xác minh")}</BusyLabel>
                              </button>
                              <a className="qa-link" data-hover-ink-control="" href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">{chatT("申请令牌 ↗", "Lấy token ↗")}</a>
                            </div>
                            {gitVerify ? <VerifyMessage result={gitVerify} okText={chatT(`令牌有效${gitVerify.login ? `（${gitVerify.login}）` : ""}`, `Token hợp lệ${gitVerify.login ? ` (${gitVerify.login})` : ""}`)} /> : null}
                          </details>
                        </div>
                      </section>
                      <section className="qa-cred-card" aria-labelledby="qa-executors-title">
                        <header className="qa-cred-head">
                          <div>
                            <strong id="qa-executors-title">{chatT("执行器", "Trình thực thi")}</strong>
                            <span>{readyCLIs.length ? readyCLIs.map(cli => cli.label).join(quickAccessListSeparator()) : sponsoredModel ? chatT("可使用平台共享模型", "Có thể dùng mô hình dùng chung của nền tảng") : chatT("尚未配置执行器", "Chưa cấu hình trình thực thi")}</span>
                          </div>
                          <StatusPill ok={cliReady} />
                        </header>
                        <div className="qa-cred-body">
                          <button type="button" className="qa-btn qa-btn-secondary" disabled={verifyingGit} onClick={() => openCredentialSettings("executors", undefined, { returnToQuickAccess: true })}>{chatT("执行器配置", "Cấu hình trình thực thi")}</button>
                          <p className="qa-hint">{chatT("在个人配置中保存后，点击「返回快速接入」继续。", "Sau khi lưu trong Cài đặt cá nhân, nhấp “Quay lại kết nối nhanh” để tiếp tục.")}</p>
                        </div>
                      </section>
                    </div>
                  ) : null}

                  {activeStep.id === "project" ? (
                    <div className="qa-pane">
                      {editableProjects.length ? (
                        <SlidingTabs
                          className="qa-sliding-tabs qa-sliding-tabs-inline"
                          aria-label={chatT("项目选择方式", "Cách chọn dự án")}
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={projectMode === "existing"}
                            onClick={() => setProjectMode("existing")}
                          >
                            <HarnessIcon name="folder" size={14} />
                            {chatT("选择已有项目", "Chọn dự án hiện có")}
                            <span className="sliding-tab-count">
                              {editableProjects.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={projectMode === "create"}
                            onClick={() => setProjectMode("create")}
                          >
                            <HarnessIcon name="sparkles" size={14} />
                            {chatT("新建项目", "Tạo dự án mới")}
                          </button>
                        </SlidingTabs>
                      ) : null}

                      {projectMode === "existing" && editableProjects.length ? (
                        <section
                          key="existing"
                          className="qa-section qa-fade-in"
                        >
                          <div className="qa-field">
                            <span className="qa-label">{chatT("选择项目", "Chọn dự án")}</span>
                            <HarnessSelect
                              value={currentProject?.id || ""}
                              options={projectSelectOptions}
                              onChange={setSelectedProjectId}
                              searchable={projectSelectOptions.length > 4}
                              searchPlaceholder={chatT("搜索项目名称或 Key…", "Tìm tên dự án hoặc key…")}
                              ariaLabel={chatT("选择项目", "Chọn dự án")}
                            />
                          </div>
                          {projectRepos.length ? (
                            <div className="qa-bound-repo-list">
                              {projectRepos.map((repo) => {
                                const isDef =
                                  repo.id ===
                                  (currentProject?.defaultRepositoryId ||
                                    defaultRepo?.id);
                                return (
                                  <div key={repo.id} className="qa-bound-repo">
                                    <span
                                      className={`qa-status-pill ${isDef ? "is-ok" : ""}`}
                                    >
                                      {isDef ? chatT("默认仓库", "Kho mã mặc định") : chatT("已关联仓库", "Kho mã đã liên kết")}
                                    </span>
                                    <strong>{repo.name}</strong>
                                    <code>
                                      {repo.provider === "github" && repo.webUrl
                                        ? repo.webUrl.replace(
                                            /^https?:\/\//,
                                            "",
                                          )
                                        : repo.gongfengProjectId || repo.webUrl || repo.cloneUrl}
                                    </code>
                                    <small>
                                      {repo.defaultBranch || "main"}
                                    </small>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </section>
                      ) : (
                        <section
                          key="create"
                          className="qa-section qa-grid-3 qa-fade-in"
                        >
                          <label className="qa-field">
                            <span className="qa-label">
                              {chatT("项目名称", "Tên dự án")} <em>*</em>
                            </span>
                            <input
                              className="qa-input"
                              value={newProjectName}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNewProjectName(value);
                                if (!idTouched)
                                  setNewProjectId(
                                    slugifyProjectId(value) || "my-project",
                                  );
                                if (!keyTouched)
                                  setNewProjectKey(deriveProjectKey(value));
                              }}
                              placeholder={chatT("例如：智能网关", "Ví dụ: Gateway thông minh")}
                            />
                          </label>
                          <label className="qa-field">
                            <span className="qa-label">
                              {chatT("项目标识", "Định danh dự án")} <em>*</em>
                            </span>
                            <input
                              className="qa-input qa-mono"
                              value={newProjectId}
                              onChange={(e) => {
                                setIdTouched(true);
                                setNewProjectId(e.target.value);
                              }}
                              placeholder="gateway-service"
                            />
                          </label>
                          <label className="qa-field">
                            <span className="qa-label">{chatT("项目 Key", "Key dự án")}</span>
                            <input
                              className="qa-input qa-mono"
                              value={newProjectKey}
                              onChange={(e) => {
                                setKeyTouched(true);
                                setNewProjectKey(e.target.value.toUpperCase());
                              }}
                              placeholder="GW"
                            />
                          </label>
                        </section>
                      )}

                      <section
                        className={`qa-cred-card ${bindRepoNow ? "" : "is-collapsed"}`}
                      >
                        <header className="qa-cred-head">
                          <div>
                            <strong>
                              {projectMode === "existing" && projectRepos.length
                                ? chatT("为该项目添加 GitHub 仓库", "Thêm kho GitHub cho dự án này")
                                : chatT("绑定默认 GitHub 仓库", "Liên kết kho GitHub mặc định")}
                            </strong>
                            <span
                              key={String(bindRepoNow)}
                              className="qa-fade-in"
                            >
                              {projectMode === "existing" && projectRepos.length
                                ? bindRepoNow
                                  ? chatT("旧项目可直接追加新仓库，复用已有流程与角色；留空则沿用现有仓库", "Dự án cũ có thể thêm trực tiếp kho mã mới, dùng lại quy trình và vai trò hiện có; để trống để dùng kho hiện tại")
                                  : chatT("沿用项目现有仓库与流程", "Dùng kho mã và quy trình hiện có của dự án")
                                : bindRepoNow
                                  ? chatT("粘贴 Git HTTPS 链接或 Git SSH 地址，自动设为项目默认仓库", "Dán liên kết Git HTTPS hoặc địa chỉ Git SSH, tự đặt làm kho mã mặc định của dự án")
                                  : chatT("已跳过，可在派发需求或项目配置中再绑定", "Đã bỏ qua; có thể liên kết khi điều phối yêu cầu hoặc trong Cài đặt dự án")}
                            </span>
                          </div>
                          <HarnessSwitch
                            checked={bindRepoNow}
                            onChange={setBindRepoNow}
                            label={chatT("添加或绑定代码仓库", "Thêm hoặc liên kết kho mã")}
                          />
                        </header>

                        <div
                          className={`qa-collapse ${bindRepoNow ? "" : "is-closed"}`}
                          inert={!bindRepoNow}
                          aria-hidden={!bindRepoNow || undefined}
                        >
                          <div className="qa-collapse-inner">
                            <div className="qa-cred-body">
                              {repoBindBlocked ? (
                                <div
                                  className="qa-hint is-warn qa-repo-permission"
                                  role="note"
                                >
                                  <p>
                                    {chatT(`「${currentProject?.name}」是已有项目，只有它的 Owner 或平台管理员可以绑定仓库。你可以：`, `“${currentProject?.name}” là dự án hiện có. Chỉ chủ sở hữu dự án hoặc quản trị viên nền tảng mới có thể liên kết kho mã. Bạn có thể:`)}
                                  </p>
                                  <div className="qa-repo-permission-actions">
                                    <button
                                      type="button"
                                      className="qa-link-btn"
                                      onClick={() => {
                                        setError("");
                                        setProjectMode("create");
                                      }}
                                    >
                                      {chatT("新建自己的项目并绑定", "Tạo dự án riêng và liên kết")}
                                    </button>
                                    <button
                                      type="button"
                                      className="qa-link-btn"
                                      onClick={() => {
                                        setError("");
                                        setBindRepoNow(false);
                                      }}
                                    >
                                      {chatT("跳过绑定，继续体验", "Bỏ qua liên kết, tiếp tục trải nghiệm")}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                              <div className="qa-repo-grid">
                                <label className="qa-field">
                                  <span className="qa-label">
                                    {projectMode === "existing" &&
                                    projectRepos.length
                                      ? chatT("新增仓库地址（可选）", "Địa chỉ kho mã mới (tùy chọn)")
                                      : chatT("Git HTTPS 链接或 Git SSH 地址", "Liên kết Git HTTPS hoặc địa chỉ Git SSH")}
                                  </span>
                                  <input
                                    className="qa-input qa-mono"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/owner/repo"
                                  />
                                </label>
                                <div className="qa-field">
                                  <span className="qa-label">{chatT("默认分支", "Nhánh mặc định")}</span>
                                  <HarnessSelect
                                    value={repoBranch}
                                    options={BRANCH_OPTIONS}
                                    onChange={setRepoBranch}
                                    searchable
                                    allowCustom
                                    searchPlaceholder={chatT("选择或输入分支名…", "Chọn hoặc nhập tên nhánh…")}
                                    ariaLabel={chatT("默认分支", "Nhánh mặc định")}
                                  />
                                </div>
                              </div>
                              {projectMode === "existing" &&
                              projectRepos.length &&
                              parsedRepo ? (
                                <div className="qa-repo-default-row qa-msg-in">
                                  <span>
                                    {chatT("已识别", "Đã nhận diện")} <code>{parsedRepo.project}</code>
                                    {chatT("，同时设为项目默认仓库", ", đồng thời đặt làm kho mã mặc định của dự án")}
                                  </span>
                                  <HarnessSwitch
                                    checked={makeDefaultRepo}
                                    onChange={setMakeDefaultRepo}
                                    label={chatT("设为项目默认仓库", "Đặt làm kho mã mặc định của dự án")}
                                  />
                                </div>
                              ) : parsedRepo ? (
                                <p
                                  key="recognized"
                                  className="qa-hint is-ok qa-msg-in"
                                >
                                  {chatT("已识别仓库：", "Kho mã đã nhận diện:")}
                                  <code>{parsedRepo.project}</code>
                                  {chatT("（仓库名", "(Tên kho mã")} <code>{parsedRepo.name}</code>{chatT("）", ")")}
                                </p>
                              ) : (
                                <p key="help" className="qa-hint">
                                  {chatT("支持 Git HTTPS 链接或 Git SSH 地址，例如", "Hỗ trợ liên kết Git HTTPS hoặc địa chỉ Git SSH, ví dụ")} <code>git@gitlab.com:group/repo.git</code>。
                                </p>
                              )}
                              {selectedRepo?.provider === "ssh" && sshKeysLoaded && !repoAccess.ready ? (
                                <p className="qa-hint is-error" role="alert">
                                  {sshCredentials.error ? chatT("无法读取 SSH 密钥配置，请稍后重试。", "Không đọc được cấu hình khóa SSH; thử lại sau.") : chatT(`尚未配置 ${selectedRepo.host} 的 SSH 密钥，可返回上一步添加，也可稍后在个人配置中添加。`, `Chưa cấu hình khóa SSH của ${selectedRepo.host}; quay lại bước trước để thêm hoặc thêm sau trong Cài đặt cá nhân.`)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  ) : null}

                  {activeStep.id === "workflow" ? (
                    <div className="qa-pane">
                      <div className="qa-field">
                        <span className="qa-label">{chatT("默认交付 SOP", "SOP bàn giao mặc định")}</span>
                        <HarnessSelect
                          value={activeWorkflow?.id || DEFAULT_SOP_ID}
                          options={sopSelectOptions}
                          onChange={setSelectedWorkflowId}
                          ariaLabel={chatT("默认交付 SOP", "SOP bàn giao mặc định")}
                        />
                      </div>

                      <section className="qa-card qa-canvas">
                        <div className="qa-canvas-head">
                          <SlidingTabs
                            className="qa-sliding-tabs qa-sliding-tabs-inline"
                            aria-label={chatT("流程与角色预览", "Xem trước quy trình và vai trò")}
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={previewTab === "stages"}
                              onClick={() => setPreviewTab("stages")}
                            >
                              <HarnessIcon name="workflow" size={14} />
                              {chatT("阶段链路", "Chuỗi giai đoạn")}
                              <span className="sliding-tab-count">
                                {nodes.length}
                              </span>
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={previewTab === "roles"}
                              onClick={() => setPreviewTab("roles")}
                            >
                              <HarnessIcon name="user" size={14} />
                              {chatT("默认角色", "Vai trò mặc định")}
                              <span className="sliding-tab-count">
                                {roles.length}
                              </span>
                            </button>
                          </SlidingTabs>
                        </div>

                        {previewTab === "stages" ? (
                          <div
                            key="stages"
                            className="qa-flow-track qa-stagger"
                            aria-label={chatT("SOP 阶段预览", "Xem trước giai đoạn SOP")}
                          >
                            <div
                              className="qa-flow-node is-edge"
                              style={{ "--i": 0 }}
                            >
                              <strong>{chatT("开始", "Bắt đầu")}</strong>
                              <span>{chatT("需求输入", "Đầu vào yêu cầu")}</span>
                            </div>
                            {nodes.map((node, index) => (
                              <React.Fragment key={node.id || index}>
                                <span
                                  className="qa-flow-arrow"
                                  aria-hidden="true"
                                  style={{ "--i": index * 2 + 1 }}
                                >
                                  →
                                </span>
                                <div
                                  className="qa-flow-node"
                                  style={{ "--i": index * 2 + 2 }}
                                >
                                  <strong>{builtinDisplay(node.name)}</strong>
                                  <span>{chatT(`阶段 ${index + 1}`, `Giai đoạn ${index + 1}`)}</span>
                                </div>
                              </React.Fragment>
                            ))}
                            <span
                              className="qa-flow-arrow"
                              aria-hidden="true"
                              style={{ "--i": nodes.length * 2 + 1 }}
                            >
                              →
                            </span>
                            <div
                              className="qa-flow-node is-edge"
                              style={{ "--i": nodes.length * 2 + 2 }}
                            >
                              <strong>{chatT("完成", "Hoàn tất")}</strong>
                              <span>{chatT("MR 与产物", "MR và sản phẩm đầu ra")}</span>
                            </div>
                          </div>
                        ) : (
                          <div key="roles" className="qa-role-chips qa-stagger">
                            {roles.map((role, index) => (
                              <span
                                key={role.id}
                                className="qa-role-chip"
                                style={{ "--i": index }}
                              >
                                <i>{(builtinDisplay(role.name) || chatT("角", "V")).slice(0, 1)}</i>
                                <b>{builtinDisplay(role.name)}</b>
                                {role.description ? (
                                  <small>{builtinDisplay(role.description)}</small>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="qa-card">
                        <div className="qa-card-title">{chatT("将要生效的配置", "Cấu hình sắp có hiệu lực")}</div>
                        <dl className="qa-summary">
                          <div>
                            <dt>{chatT("凭据", "Thông tin xác thực")}</dt>
                            <dd>
                              <span
                                className={`qa-dot ${repoAccess.ready && cliReady ? "is-ok" : ""}`}
                              />
                              <span>
                                {repoAccess.label} {repoAccess.ready ? chatT("已配置", "Đã cấu hình") : chatT("未配置", "Chưa cấu hình")} ·
                                CLI · {readyCLIs.length ? readyCLIs.map(cli => cli.label).join(quickAccessListSeparator()) :
                                  sponsoredModel ? chatT("使用平台共享模型", "Dùng mô hình dùng chung của nền tảng") : chatT("未配置", "Chưa cấu hình")}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt>{chatT("项目与仓库", "Dự án và kho mã")}</dt>
                            <dd>
                              <span className="qa-dot is-ok" />
                              <span>
                                {projectMode === "create"
                                  ? chatT(`新建项目「${newProjectName || "新项目"}」`, `Tạo dự án “${newProjectName || "Dự án mới"}”`)
                                  : chatT(`使用已有项目「${currentProject?.name || "当前项目"}」`, `Dùng dự án hiện có “${currentProject?.name || "Dự án hiện tại"}”`)}
                                {" · "}
                                {bindRepoNow && parsedRepo && !repoBindBlocked
                                  ? chatT(`绑定 ${parsedRepo.name}`, `Liên kết ${parsedRepo.name}`)
                                  : defaultRepo?.name || chatT("运行时指定仓库", "Chỉ định kho mã khi chạy")}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt>{chatT("默认 SOP", "SOP mặc định")}</dt>
                            <dd>
                              <span className="qa-dot is-ok" />
                              <span>
                                {chatT(`${builtinDisplay(activeWorkflow?.name || "通用后端交付 SOP")}（${roles.length} 个默认角色）`, `${builtinDisplay(activeWorkflow?.name || "通用后端交付 SOP")} (${roles.length} vai trò mặc định)`)}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </section>
                    </div>
                  ) : null}
                </div>
              </div>

              <footer className="qa-footer">
                <button
                  type="button"
                  className="qa-btn qa-btn-ghost"
                  data-hover-ink-control=""
                  disabled={saving}
                  onClick={onClose}
                >
                  {chatT("稍后再说", "Để sau")}
                </button>
                <div className="qa-footer-spacer" />
                {step > 0 ? (
                  <button
                    type="button"
                    className={`qa-btn qa-btn-outline ${stepAnimated && step === 1 && direction === "forward" ? "qa-back-enter" : ""}`}
                    data-hover-ink-control=""
                    disabled={saving}
                    onClick={() => {
                      setError("");
                      goToStep(Math.max(0, step - 1));
                    }}
                  >
                    <HarnessIcon name="chevron-left" size={14} />
                    {chatT("上一步", "Bước trước")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="qa-btn qa-btn-primary"
                  aria-busy={saving || undefined}
                  disabled={verifyingGit || ((loading || (activeStep.id === "auth" && credentialsPending)) && !saving)}
                  onClick={nextStep}
                >
                  <BusyLabel busy={saving} busyLabel={chatT("正在保存…", "Đang lưu…")}>
                    {activeStep.id === "workflow" ? chatT("完成接入", "Hoàn tất kết nối") : chatT("下一步", "Bước tiếp theo")}
                    <HarnessIcon
                      name={
                        activeStep.id === "workflow"
                          ? "sparkles"
                          : "chevron-right"
                      }
                      size={14}
                    />
                  </BusyLabel>
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
