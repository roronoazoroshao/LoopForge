import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('runner.claimed message is localized in both catalogues without changing its event identity', () => {
  const context = vm.createContext({ window: {} });
  for (const name of ['i18n-en.js', 'i18n-vi.js']) {
    const code = readFileSync(new URL('../../web/' + name, import.meta.url), 'utf8');
    vm.runInContext(code, context, { filename: name });
  }
  const source = '执行机器已领取任务，正在准备工作区和沙箱';
  assert.equal(context.window.LF_I18N_VI[source], 'Máy thực thi đã nhận tác vụ, đang chuẩn bị không gian làm việc và sandbox');
  assert.equal(context.window.LF_I18N_EN[source], 'The execution machine has claimed the task and is preparing the workspace and sandbox');
  assert.equal(context.window.LF_I18N_VI['用户自定义 SOP 步骤'], undefined);
});
