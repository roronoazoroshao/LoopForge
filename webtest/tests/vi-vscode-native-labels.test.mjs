import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../../web/vscode.js", import.meta.url), "utf8");
const begin = source.indexOf("windowIndicator: {");
const end = source.indexOf("\n      });", begin);
assert.ok(begin >= 0 && end > begin, "VS Code options are present");
const nativeOptions = source.slice(begin, end);
const translator = lang => (zh, en, vi) => lang === "vi" ? vi : lang === "en" ? en : zh;

function options(lang, readOnly) {
  const actions = [];
  const context = {
    window: { lfT: translator(lang) },
    runId: "run-123456789012",
    embedded: true,
    workspaceReadOnly: readOnly,
    postParent: action => actions.push(action),
    openVSCodeWindow: () => true,
  };
  return { options: vm.runInNewContext("({" + nativeOptions + "})", context), actions };
}

test("VS Code internal tooltips and registered commands use Vietnamese, not DOM translation", () => {
  const { options: ui, actions } = options("vi", true);
  assert.equal(ui.windowIndicator.tooltip, "Không gian làm việc tác vụ · chỉ đọc");
  assert.equal(ui.windowIndicator.label, "$(remote) LOOP 123456789012");
  assert.deepEqual(Array.from(ui.commands, command => command.id), ["agentflow.popout", "agentflow.maximize"]);
  assert.deepEqual(Array.from(ui.commands, command => command.label), ["Mở VS Code trong cửa sổ mới", "Chế độ tập trung"]);
  ui.commands[0].handler();
  ui.commands[1].handler();
  assert.deepEqual(actions, ["popout", "maximize"]);
  assert.equal(options("vi", false).options.windowIndicator.tooltip, "Không gian làm việc tác vụ · đọc/ghi và terminal tương tác");
});

test("VS Code internal copy preserves English and Chinese modes", () => {
  assert.equal(options("en", false).options.windowIndicator.tooltip, "Task workspace · read/write and interactive terminal");
  assert.equal(options("en", true).options.commands[0].label, "Open VS Code in a new window");
  assert.equal(options("zh", true).options.commands[1].label, "沉浸模式");
  assert.equal(options("zh", true).options.windowIndicator.tooltip, "任务工作区 · 只读");
});

test("dynamic loader error localizes the prefix without altering its script URL", async () => {
  const first = source.indexOf("function loadScript(src)");
  const last = source.indexOf("function loadStyle(href)", first);
  assert.ok(first >= 0 && last > first, "loader code is present");
  const sourceFunction = source.slice(first, last);
  const resource = "/vscode-web/out/vs/workbench/workbench.web.main.js?v=local-1";
  for (const [lang, prefix] of [["vi", "Không tải được: "], ["en", "Failed to load: "], ["zh", "加载失败: "]]) {
    const context = {
      window: { lfT: translator(lang) },
      document: {
        createElement: () => ({}),
        head: { appendChild: element => element.onerror() },
      },
    };
    const promise = vm.runInNewContext(sourceFunction + "\nloadScript(" + JSON.stringify(resource) + ")", context);
    await assert.rejects(promise, { message: prefix + resource });
  }
});
