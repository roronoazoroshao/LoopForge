import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = file => readFileSync(new URL("../../" + file, import.meta.url), "utf8");
const expected = [
  [
    "origin 必须为 all、internal 或 external",
    "origin must be all, internal, or external",
    "origin chỉ được là all, internal hoặc external"
  ],
  [
    "手动运行需要登录用户或已配置 Owner 的项目",
    "Manual runs require a signed-in user or a project with an Owner configured",
    "Lượt chạy thủ công yêu cầu người dùng đăng nhập hoặc dự án đã cấu hình Owner"
  ],
  [
    "项目默认代码仓库无效，请重新绑定",
    "The project's default repository is invalid; reconnect it",
    "Kho mã mặc định của dự án không hợp lệ; hãy liên kết lại"
  ],
  [
    "工作区正在使用或保存，稍后自动重试",
    "The workspace is in use or being saved. Retrying shortly",
    "Không gian làm việc đang được sử dụng hoặc lưu; hệ thống sẽ tự thử lại sau"
  ],
  [
    "没有已保存的工作区快照，无法恢复",
    "No saved workspace snapshot is available to restore",
    "Không có bản chụp không gian làm việc đã lưu để khôi phục"
  ],
  [
    "工作区已回收；有保存的快照时可按需恢复，空闲 1 小时后再次回收",
    "The workspace was reclaimed. Restore it from a saved snapshot if available; it will be reclaimed after one hour of inactivity",
    "Không gian làm việc đã được thu hồi. Có thể khôi phục từ bản chụp đã lưu (nếu có); hệ thống sẽ thu hồi lại sau 1 giờ không hoạt động"
  ],
  [
    "执行机器 Daemon 已卸载，工作区已随之删除；重新连接执行机器也无法恢复此工作区",
    "The runner daemon was uninstalled and its workspace deleted; reconnecting the runner cannot restore it",
    "Daemon của máy thực thi đã bị gỡ cài đặt và không gian làm việc cũng đã bị xóa; kết nối lại máy không thể khôi phục không gian này"
  ],
  [
    "工作区尚未创建或已被清理",
    "The workspace has not been created or was cleaned up",
    "Không gian làm việc chưa được tạo hoặc đã bị dọn dẹp"
  ],
  [
    "远程工作区通道未配置",
    "The remote workspace channel is not configured",
    "Chưa cấu hình kênh kết nối không gian làm việc từ xa"
  ],
  [
    "远程执行机器当前离线或工作区通道不可用",
    "The remote runner is offline or its workspace channel is unavailable",
    "Máy thực thi từ xa đang ngoại tuyến hoặc kênh không gian làm việc không khả dụng"
  ],
  [
    "远程工作区读取超时",
    "Timed out reading the remote workspace",
    "Quá thời gian đọc không gian làm việc từ xa"
  ],
  [
    "远程执行机器返回了空响应",
    "The remote runner returned an empty response",
    "Máy thực thi từ xa trả về phản hồi rỗng"
  ],
  [
    "Git 状态读取失败",
    "Could not read Git status",
    "Không đọc được trạng thái Git"
  ]
];
const goSources = [
  "internal/httpapi/runs.go",
  "internal/httpapi/workspace_preparation.go",
  "internal/httpapi/workspace_restore.go",
  "internal/httpapi/run_workspace.go",
].map(read);
function catalogue(locale) {
  const window = {};
  vm.runInNewContext(read("web/i18n-" + locale + ".js"), {window});
  return window["LF_I18N_" + locale.toUpperCase()];
}
function translator(locale) {
  const window = { confirm() {}, alert() {}, prompt() {} };
  const document = { documentElement: { dataset: { lang: locale }, classList: { contains: () => false } }, readyState: "loading", addEventListener() {} };
  vm.runInNewContext(read("web/i18n-en.js") + "\n" + read("web/i18n-vi.js") + "\n" + read("web/i18n.js"), {
    window, document, MutationObserver: class {}
  });
  return window.lfTranslate;
}
test("Go-origin run/workspace messages have Vietnamese and English display translations", () => {
  const vi = catalogue("vi"), en = catalogue("en");
  assert.equal(Object.keys(vi).length, Object.keys(en).length);
  for (const [source, english, vietnamese] of expected) {
    assert.ok(goSources.some(go => go.includes(JSON.stringify(source))), "actual Go-origin text: " + source);
    assert.equal(vi[source], vietnamese, "vi: " + source);
    assert.equal(en[source], english, "en: " + source);
  }
});
test("the runtime translator localizes known Go UI errors but keeps API codes and unknown diagnostics", () => {
  const translate = translator("vi");
  assert.equal(translate("项目默认代码仓库无效，请重新绑定"), "Kho mã mặc định của dự án không hợp lệ; hãy liên kết lại");
  assert.equal(translate("工作区正在使用或保存，稍后自动重试"), "Không gian làm việc đang được sử dụng hoặc lưu; hệ thống sẽ tự thử lại sau");
  assert.equal(translate("origin 必须为 all、internal 或 external"), "origin chỉ được là all, internal hoặc external");
  assert.equal(translate("workspace_busy"), "workspace_busy");
  assert.equal(translate("repository_required"), "repository_required");
  assert.equal(translate("custom-run-001"), "custom-run-001");
  assert.equal(translator("zh")("远程工作区读取超时"), "远程工作区读取超时");
});
