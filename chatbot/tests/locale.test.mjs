import { test } from "vitest";
import assert from "node:assert/strict";
import { chatLocale, chatT } from "../src/locale.js";

test("chat uses the shared Vietnamese locale and falls back to Chinese", () => {
  const previous = localStorage.getItem("loopforge.lang");
  try {
    localStorage.setItem("loopforge.lang", "vi");
    assert.equal(chatLocale(), "vi");
    assert.equal(chatT("发送", "Gửi"), "Gửi");
    localStorage.setItem("loopforge.lang", "en");
    assert.equal(chatLocale(), "zh");
    assert.equal(chatT("发送", "Gửi"), "发送");
    localStorage.removeItem("loopforge.lang");
    assert.equal(chatLocale(), "zh");
  } finally {
    if (previous === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", previous);
  }
});
