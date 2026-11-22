import { chatT } from "./locale";
import React, { useEffect, useState } from "react";
import HarnessIcon from "./HarnessIcon";
import SlidingTabs from "./SlidingTabs";
import ActivityTrace from "./ActivityTrace";
import { RichContent } from "./RichContent";
import { resumeMissed } from "./activity";

export function subagentStatus(agent, live) {
  const last = agent.dispatches.at(-1);
  if (last?.failed) return { label: chatT("失败", "Thất bại"), tone: "failed" };
  if (!last?.finishedAt)
    return live
      ? { label: chatT("运行中", "Đang chạy"), tone: "running" }
      : { label: chatT("已中断", "Đã gián đoạn"), tone: "interrupted" };
  return { label: chatT("已完成", "Đã hoàn tất"), tone: "done" };
}

export function subagentName(agent) {
  return agent.role || agent.subagent || chatT("子 Agent", "Tác tử con");
}

// The subagent's last paragraph is its report, which also comes back as the
// Agent result; it is shown once, as the reply.
function processSteps(step) {
  const report = (step.output || "").replace(/\s+/g, "");
  return (step.children || []).filter(
    (child) =>
      !(
        report &&
        child.kind === "text" &&
        report.includes((child.text || "").replace(/\s+/g, ""))
      ),
  );
}

// SubagentSession shows one subagent like an SOP node: what Main Bot asked,
// the model it ran on, how it worked and what it reported, once per dispatch
// when it was resumed, plus its collected deliverables and what it published.
export function SubagentSession({ agent, live = false, artifacts = [], onOpenArtifact }) {
  const [tab, setTab] = useState("conversation");
  useEffect(() => setTab("conversation"), [agent.key]);
  // A deliverable opens the attachment of the reply that holds its dispatch,
  // not an older file of the same name. Until that reply is saved there is
  // no attachment yet.
  const published = agent.published.map((item) => {
    const pending = item.source === "交付物" && !item.missing && item.messageIndex == null;
    const artifact =
      item.missing || pending
        ? null
        : [...artifacts]
            .reverse()
            .find(
              (artifact) =>
                artifact.name === item.title &&
                (item.source !== "交付物" || artifact.messageIndex === item.messageIndex),
            );
    return { ...item, pending, artifact };
  });
  return (
    <section
      className="sop-run-embedded sop-run-panel node-conversation-view subagent-session"
      aria-label={chatT("子 Agent 会话", "Cuộc trò chuyện tác tử con")}
    >
      <div className="sop-panel-scroll">
        <SlidingTabs className="node-tabs" aria-label={chatT("子 Agent 详情", "Chi tiết tác tử con")}>
          <button
            role="tab"
            aria-selected={tab === "conversation"}
            onClick={() => setTab("conversation")}
          >
            <HarnessIcon name="chat" size={14} />
            {chatT("会话过程", "Quá trình trò chuyện")}
          </button>
          <button
            role="tab"
            aria-selected={tab === "artifacts"}
            onClick={() => setTab("artifacts")}
          >
            <HarnessIcon name="doc" size={14} />
            {chatT("产物", "Sản phẩm đầu ra")} {published.length || ""}
          </button>
        </SlidingTabs>
        {tab === "conversation" ? (
          <div className="node-conversation">
            {agent.dispatches.map((step) => {
              const running = live && !step.finishedAt;
              const steps = processSteps(step);
              return (
                <React.Fragment key={step.id}>
                  {step.input || step.detail ? (
                    <article
                      className="node-message node-message-user"
                      aria-label={chatT("收到的任务", "Tác vụ đã nhận")}
                    >
                      <span className="node-message-sender">{chatT("AI 助手", "Trợ lý AI")}</span>
                      <RichContent message={step.input || step.detail} />
                    </article>
                  ) : null}
                  {agent.models?.[step.id] ? (
                    <p className="muted subagent-model" aria-label={chatT("运行模型", "Mô hình thực thi")}>
                      {chatT("模型", "Mô hình")} · {agent.models[step.id]}
                    </p>
                  ) : null}
                  {resumeMissed(step) ? (
                    <p className="muted subagent-resume-missed" role="note">
                      {chatT(`复用未生效：没有接着 ${step.resumed} 做，已新开子 Agent。`, `Không tái sử dụng được: chưa tiếp tục ${step.resumed}, đã mở tác tử con mới.`)}
                    </p>
                  ) : null}
                  {steps.length || running ? (
                    <ActivityTrace
                      steps={steps}
                      startedAt={step.startedAt}
                      finishedAt={step.finishedAt !== "done" ? step.finishedAt : null}
                      live={running}
                      interrupted={!live && !step.finishedAt}
                    />
                  ) : null}
                  {step.output ? (
                    <article
                      className="node-message node-message-assistant node-result"
                      aria-label={chatT("子 Agent 汇报", "Báo cáo tác tử con")}
                    >
                      <RichContent message={step.output} />
                    </article>
                  ) : step.failed ? (
                    <p className="error">{chatT("这次派发失败了。", "Lượt điều phối này thất bại.")}</p>
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="node-artifacts">
            {published.map(({ title, source, missing, pending, artifact }, index) =>
              artifact ? (
                <button
                  type="button"
                  className="artifact-row"
                  key={`${title}-${index}`}
                  onClick={() => onOpenArtifact?.(artifact)}
                >
                  <HarnessIcon name="doc" size={17} />
                  <span>
                    <strong>{title}</strong>
                    <small>{source}</small>
                  </span>
                  <HarnessIcon name="chevron-right" size={14} />
                </button>
              ) : (
                <div className="artifact-row" key={`${title}-${index}`} data-missing={missing || undefined}>
                  <HarnessIcon name={missing ? "alert" : "doc"} size={17} />
                  <span>
                    <strong>{title}</strong>
                    <small>{missing ? chatT("缺少必需交付物", "Thiếu sản phẩm bàn giao bắt buộc") : pending ? chatT("交付物 · 回复完成后可打开", "Sản phẩm bàn giao · có thể mở sau khi phản hồi hoàn tất") : source}</small>
                  </span>
                </div>
              ),
            )}
            {!published.length ? (
              <p className="muted">{chatT("这个子 Agent 没有交付物或发布的产物。", "Tác tử con này không có sản phẩm bàn giao hoặc đầu ra đã công bố.")}</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
