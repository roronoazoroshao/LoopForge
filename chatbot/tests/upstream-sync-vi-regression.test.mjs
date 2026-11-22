import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = path => readFileSync(new URL(path, import.meta.url), "utf8");
test("ReferenceInput localizes errors but preserves asset identity", () => {
  const code=source("../src/ReferenceInput.jsx");
  assert.match(code, /import \{ chatT \} from "\.\/locale\.js"/);
  assert.match(code, /chatT\("每次最多引用 12 个对象。"/);
  assert.match(code, /Xóa tham chiếu \$\{asset\.name \|\| asset\.id\}/);
});
test("scheduled prompt editor has Vietnamese accessible text", () => {
  const code=source("../src/prompt-editor-entry.jsx");
  assert.match(code, /chatT\("提示词", "Câu lệnh"\)/);
  assert.match(code, /Tham chiếu tài nguyên dự án/);
  assert.match(code, /Theo lịch, trợ lý/);
});
test("chat composer selector survives translated aria-label", () => {
  const code=source("../src/App.jsx");
  assert.match(code, /<ReferenceInput/);
  assert.match(code, /"data-chat-composer": "true"/);
  assert.match(code, /"aria-label": chatT\("消息", "Tin nhắn"\)/);
});
test("shared references localize UI copy but not asset data", () => {
  const code=source("../../web/app/shared-schedules.js");
  assert.match(code, /window\.lfT\('随版本共享的引用资产：'/);
  assert.match(code, /ref\.name\|\|ref\.id/);
  assert.match(code, /Phiên bản này không có tài nguyên tham chiếu/);
});
test("AI schedule asset errors have Vietnamese copy", () => {
  const code=source("../../web/app/sync-schedule.js");
  assert.match(code, /Tài nguyên dự án được tham chiếu không hợp lệ/);
  assert.match(code, /tối đa 12 tài nguyên dự án/);
  assert.match(code, /Không tải được bộ chọn tài nguyên dự án/);
});
