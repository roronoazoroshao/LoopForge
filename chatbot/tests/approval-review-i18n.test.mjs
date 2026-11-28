import { test } from "vitest";
import assert from "node:assert/strict";
import { approvalReviewStatusText, approvalReviewDetailText } from "../src/locale.js";
import { mergeActivity, activityFace, traceBlocks } from "../src/activity.js";

test("approval review events retain original values while UI labels follow locale", () => {
  const prior = localStorage.getItem("loopforge.lang");
  const event = { kind: "status", text: "帮我批准：已批准", detail: "规则快路径 · 原始审查说明" };
  try {
    const steps = mergeActivity([], [{ sequence: 1, data: event }]);
    const cases = [
      ["vi", "Phê duyệt tự động: Đã phê duyệt", "Quy tắc xử lý nhanh · 原始审查说明"],
      ["en", "Auto-approval: Approved", "Rule fast path · 原始审查说明"],
      ["zh", event.text, event.detail],
    ];
    for (const [locale, status, detail] of cases) {
      localStorage.setItem("loopforge.lang", locale);
      assert.equal(approvalReviewStatusText(steps[0].text), status);
      assert.equal(approvalReviewDetailText(steps[0].detail), detail);
      assert.equal(activityFace(steps[0]).busy, status);
    }
    assert.equal(traceBlocks(steps, { live: true })[0].steps[0].text, event.text);
    assert.equal(traceBlocks(steps)[0].steps[0].detail, event.detail);
    assert.equal(steps[0].detail, event.detail);
    assert.equal(steps[0].text, event.text);
    assert.equal(event.detail, "规则快路径 · 原始审查说明");
  } finally {
    if (prior === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", prior);
  }
});

test("other review statuses are localized and unknown messages remain raw", () => {
  const prior = localStorage.getItem("loopforge.lang");
  try {
    localStorage.setItem("loopforge.lang", "vi");
    assert.equal(approvalReviewStatusText("帮我批准：已拒绝"), "Phê duyệt tự động: Đã từ chối");
    assert.equal(approvalReviewStatusText("帮我批准：审查不可用"), "Phê duyệt tự động: Không thể rà soát");
    assert.equal(approvalReviewStatusText("帮我批准：正在审查操作"), "Phê duyệt tự động: Đang rà soát thao tác");
    assert.equal(approvalReviewDetailText("熔断保护 · 原始审查说明"), "Bảo vệ ngắt mạch · 原始审查说明");
    assert.equal(approvalReviewStatusText("帮我批准：未知状态"), "帮我批准：未知状态");
    assert.equal(approvalReviewDetailText("custom-model · explanation"), "custom-model · explanation");
    assert.equal(approvalReviewStatusText(null), null);
  } finally {
    if (prior === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", prior);
  }
});

test("approval trace keeps distinct reviews, hides ordinary transport statuses, and retains model IDs", () => {
  const prior = localStorage.getItem("loopforge.lang");
  try {
    localStorage.setItem("loopforge.lang", "vi");
    const events = [
      {kind:"status", text:"connecting"},
      {kind:"status", text:"帮我批准：正在审查操作", detail:"审查模型：model/a"},
      {kind:"status", text:"帮我批准：正在审查操作", detail:"审查模型：model/b"},
      {kind:"status", text:"帮我批准：正在审查操作", detail:"审查模型：model/b"},
      {kind:"status", text:"帮我批准：已批准", detail:"规则快路径 · raw rationale"},
      {kind:"status", text:"帮我批准：已批准", detail:"熔断保护 · other rationale"},
    ].map((data, sequence) => ({data, sequence}));
    const steps = mergeActivity([], events);
    const visible = traceBlocks(steps, {live:true}).flatMap(block => block.steps || []);
    assert.equal(visible.length, 4);
    assert.equal(approvalReviewDetailText(visible[0].detail), "Mô hình rà soát: model/a");
    assert.equal(approvalReviewDetailText(visible[1].detail), "Mô hình rà soát: model/b");
    assert.equal(visible[3].detail, "熔断保护 · other rationale");
    assert.equal(steps[0].text, "connecting");
  } finally {
    if (prior === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", prior);
  }
});
