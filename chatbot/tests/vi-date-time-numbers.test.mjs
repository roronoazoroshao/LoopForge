import { test } from "vitest";
import assert from "node:assert/strict";
import { chatDateTime } from "../src/locale.js";
import { fullTime, formatTokens, messageTimeLabel, messageInfo } from "../src/message-info.js";

test("Vietnamese display dates and token counts use Vietnamese conventions without rewriting API data", () => {
  const previous = localStorage.getItem("loopforge.lang");
  const stamp = new Date(2026, 10, 22, 9, 4, 0);
  try {
    localStorage.setItem("loopforge.lang", "vi");
    assert.equal(fullTime(stamp), "22/11/2026 09:04");
    assert.equal(messageTimeLabel(stamp, new Date(2026, 10, 23, 12)), "22/11 09:04");
    assert.equal(messageTimeLabel(stamp, new Date(2027, 0, 1, 12)), "22/11/2026 09:04");
    assert.equal(messageTimeLabel(stamp, stamp), "09:04");
    assert.equal(chatDateTime(stamp), stamp.toLocaleString("vi-VN", { hour12: false }));
    assert.equal(chatDateTime("not a timestamp"), "—");
    assert.equal(chatDateTime(null), "—");
    assert.equal(formatTokens(1234567), "1.234.567");
    const raw = { speakerName: "张三", model: "custom-model_77", createdAt: stamp, usage: { inputTokens: 1234567 } };
    const shown = messageInfo(raw);
    assert.equal(shown.rows.find(row => row.key === "agent").value, raw.speakerName);
    assert.equal(shown.rows.find(row => row.key === "model").value, raw.model);
    assert.equal(shown.totalText, "1.234.567");
    assert.equal(raw.createdAt, stamp);
  } finally {
    if (previous === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", previous);
  }
});

test("existing Chinese/English display conventions remain unchanged", () => {
  const previous = localStorage.getItem("loopforge.lang");
  const stamp = new Date(2026, 10, 22, 9, 4, 0);
  try {
    for (const lang of ["zh", "en"]) {
      localStorage.setItem("loopforge.lang", lang);
      assert.equal(fullTime(stamp), "2026-11-22 09:04");
      assert.equal(messageTimeLabel(stamp, new Date(2026, 10, 23, 12)), "11-22 09:04");
      assert.equal(messageTimeLabel(stamp, new Date(2027, 0, 1, 12)), "2026-11-22 09:04");
      assert.equal(formatTokens(1234567), "1,234,567");
      assert.equal(chatDateTime(stamp), stamp.toLocaleString("zh-CN", { hour12: false }));
    }
  } finally {
    if (previous === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", previous);
  }
});
