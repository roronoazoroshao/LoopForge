import { test } from "vitest";
import assert from "node:assert/strict";
import { approvalReviewStatusText, approvalReviewDetailText } from "../src/locale.js";
import { activityFace } from "../src/activity.js";

test("approval review statuses are display-localized without changing events", () => {
  const before = localStorage.getItem("loopforge.lang");
  const event = { kind: "status", text: "帮我批准：已批准", detail: "规则快路径 · 原始审查说明" };
  try {
    const cases = [
      ["vi", "Phê duyệt tự động: Đã phê duyệt", "Quy tắc xử lý nhanh · 原始审查说明"],
      ["en", "Auto-approval: Approved", "Rule fast path · 原始审查说明"],
      ["zh", event.text, event.detail],
    ];
    for (const [locale, text, detail] of cases) {
      localStorage.setItem("loopforge.lang", locale);
      assert.equal(approvalReviewStatusText(event.text), text);
      assert.equal(approvalReviewDetailText(event.detail), detail);
      assert.equal(activityFace(event).busy, text);
    }
    assert.equal(event.text, "帮我批准：已批准");
    assert.equal(event.detail, "规则快路径 · 原始审查说明");
  } finally {
    if (before === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", before);
  }
});

test("review denied, unavailable, and in-progress states have translations", () => {
  const before = localStorage.getItem("loopforge.lang");
  try {
    localStorage.setItem("loopforge.lang", "vi");
    assert.equal(approvalReviewStatusText("帮我批准：已拒绝"), "Phê duyệt tự động: Đã từ chối");
    assert.equal(approvalReviewStatusText("帮我批准：审查不可用"), "Phê duyệt tự động: Không thể rà soát");
    assert.equal(approvalReviewStatusText("帮我批准：正在审查操作"), "Phê duyệt tự động: Đang rà soát thao tác");
    assert.equal(approvalReviewDetailText("熔断保护 · 原始审查说明"), "Bảo vệ ngắt mạch · 原始审查说明");
    assert.equal(approvalReviewStatusText("帮我批准：未知状态"), "帮我批准：未知状态");
    assert.equal(approvalReviewDetailText("custom-model · explanation"), "custom-model · explanation");
    assert.equal(approvalReviewDetailText("用户写的内容"), "用户写的内容");
    assert.equal(approvalReviewStatusText(null), null);
  } finally {
    if (before === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", before);
  }
});
