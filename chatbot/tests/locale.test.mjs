import { test } from "vitest";
import assert from "node:assert/strict";
import { chatLocale, chatT, artifactSourceLabel, chatServerErrorText, chatDateTime } from "../src/locale.js";

test("chat selects explicit VI/EN/ZH translations and preserves untranslated source text", () => {
  const previous = localStorage.getItem("loopforge.lang");
  try {
    localStorage.setItem("loopforge.lang", "vi");
    assert.equal(chatLocale(), "vi");
    assert.equal(chatT("发送", "Gửi", "Send"), "Gửi");
    assert.equal(artifactSourceLabel("已发布"), "Đã phát hành");
    assert.equal(chatServerErrorText("模型 ID 无效"), "ID mô hình không hợp lệ.");
    localStorage.setItem("loopforge.lang", "en");
    assert.equal(chatLocale(), "en");
    assert.equal(chatT("发送", "Gửi"), "发送");
    assert.equal(chatT("发送", "Gửi", "Send"), "Send");
    assert.equal(artifactSourceLabel("已发布"), "Published");
    assert.equal(artifactSourceLabel("自定义产物"), "自定义产物");
    assert.equal(chatServerErrorText("模型 ID 无效"), "Invalid model ID.");
    assert.equal(chatServerErrorText("自定义模型"), "自定义模型");
    assert.equal(chatDateTime("2026-11-24T00:00:00Z"), new Date("2026-11-24T00:00:00Z").toLocaleString("en-US", { hour12: false }));
    localStorage.removeItem("loopforge.lang");
    assert.equal(chatLocale(), "zh");
    assert.equal(chatT("发送", "Gửi", "Send"), "发送");
    assert.equal(artifactSourceLabel("已发布"), "已发布");
    assert.equal(chatServerErrorText("模型 ID 无效"), "模型 ID 无效");
  } finally {
    if (previous === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", previous);
  }
});
