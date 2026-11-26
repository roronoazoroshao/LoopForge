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
      assert.equal(approvalReviewDetailText(event.detail), detail);
      assert.equal(activityFace(steps[0]).busy, status);
    }
    // Status events are transport-only in the current trace renderer.
    assert.deepEqual(traceBlocks(steps, { live: true }), []);
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
