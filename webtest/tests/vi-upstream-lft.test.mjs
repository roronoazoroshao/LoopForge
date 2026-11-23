import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL('../../web/' + path, import.meta.url), 'utf8');

test('upstream sandbox, Git HTTPS and observability labels have explicit Vietnamese translations', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read('i18n-en.js'), context);
  vm.runInContext(read('i18n-vi.js'), context);
  const en = context.window.LF_I18N_EN;
  const vi = context.window.LF_I18N_VI;
  let count = 0;
  for (const file of ['app/flows.js', 'app/git-http-credentials.js', 'app/observability.js', 'app/platform-https-hosts.js']) {
    const matches = [...read(file).matchAll(/lfT\(\s*'([^']+)'\s*,\s*'([^']+)'/g)];
    assert.ok(matches.length > 0, 'expected localization calls in ' + file);
    for (const [, zh, fallback] of matches) {
      if (!/[\u3400-\u9fff]/u.test(zh)) continue;
      assert.ok(en[zh]?.trim(), 'English text: ' + file + ': ' + zh);
      assert.ok(vi[zh]?.trim(), 'Vietnamese text: ' + file + ': ' + zh);
      count++;
    }
  }
  assert.ok(count >= 30, 'covered the new translation surfaces');
});
