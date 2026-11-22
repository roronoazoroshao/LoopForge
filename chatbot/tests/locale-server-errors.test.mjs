import { test } from "vitest";
import assert from "node:assert/strict";
import { chatServerErrorText } from "../src/locale.js";

function withLocale(lang, fn) {
  const previous = localStorage.getItem("loopforge.lang");
  localStorage.setItem("loopforge.lang", lang);
  try { fn(); }
  finally {
    if (previous === null) localStorage.removeItem("loopforge.lang");
    else localStorage.setItem("loopforge.lang", previous);
  }
}

test("Claude Code credential errors render an entire Vietnamese sentence", () => {
  withLocale("vi", () => {
    for (const source of [
      "Claude Code: 请先在个人配置中配置 Claude Code API Key 后再使用 Claude Code 模型",
      "Claude Code: 请先在个人配置中配置 Claude Code API Key 后再使用 Claude Code Mô hình",
    ]) {
      const translated = chatServerErrorText(source);
      assert.match(translated, /Claude Code: Chưa cấu hình Claude Code API Key/);
      assert.match(translated, /Base URL/);
      assert.doesNotMatch(translated, /[\u3400-\u9fff]/u);
    }
  });
});

test("known model discovery errors localize while retaining endpoints and HTTP status", () => {
  withLocale("vi", () => {
    assert.equal(chatServerErrorText("服务没有返回可用模型，可以手动添加模型"),
      "Dịch vụ không trả về mô hình khả dụng. Bạn có thể thêm ID mô hình thủ công.");
    assert.match(chatServerErrorText("获取模型列表失败：无法连接 http://localhost:20128/v1/models：connection refused"),
      /Không tải được danh sách mô hình: Không kết nối được http:\/\/localhost:20128\/v1\/models: connection refused/);
    assert.match(chatServerErrorText("OmniRoute 拒绝了 API Key（HTTP 403）"), /HTTP 403/);
  });
});

test("Chinese locale and arbitrary user-authored or diagnostic text remain exact", () => {
  const raw = "Claude Code: 请先在个人配置中配置 Claude Code API Key 后再使用 Claude Code 模型";
  withLocale("zh", () => assert.equal(chatServerErrorText(raw), raw));
  withLocale("vi", () => {
    const custom = "Tên model 中文 do người dùng đặt";
    assert.equal(chatServerErrorText(custom), custom);
    assert.equal(chatServerErrorText("network failed with strange provider response"), "network failed with strange provider response");
  });
});
