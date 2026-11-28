import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL('../../web/' + path, import.meta.url), 'utf8');

test('new HTTPS host authorization controls have Vietnamese catalogue text for every English fallback', () => {
  const source = read('app/platform-https-hosts.js');
  const context = vm.createContext({ window: {} });
  vm.runInContext(read('i18n-en.js'), context);
  vm.runInContext(read('i18n-vi.js'), context);
  const en = context.window.LF_I18N_EN;
  const vi = context.window.LF_I18N_VI;
  const strings = [...source.matchAll(/lfT\(\s*'([^']+)'\s*,\s*'([^']+)'/g)];
  assert.ok(strings.length >= 20, 'the complete authorization panel was scanned');
  for (const [, zh, fallback] of strings) {
    assert.equal(en[zh], fallback, 'English catalogue entry for ' + zh);
    assert.ok(vi[zh] && vi[zh] !== fallback, 'Vietnamese translation for ' + zh);
  }
  // Git host names, resolved addresses and credential IDs are user/server data.
  assert.match(source, /data-i18n-skip/);
  assert.match(source, /escapeHTML\(entry\.host\)/);
  assert.match(source, /escapeHTML\(address\)/);
});
