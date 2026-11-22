import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const load = file => readFileSync(new URL('../../web/' + file, import.meta.url), 'utf8');
function fixture(locale) {
  const root = { dataset: {}, classList: { contains: () => false } };
  const stored = new Map([['loopforge.lang', locale]]);
  let reloaded = false;
  const window = { confirm: () => true, alert: () => {}, prompt: () => null };
  const context = vm.createContext({
    document: { documentElement: root, readyState: 'loading', addEventListener() {}, querySelectorAll: () => [] },
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    sessionStorage: { getItem: () => null },
    matchMedia: () => ({ matches: true }), location: { reload: () => { reloaded = true; } },
    MutationObserver: class {}, window,
  });
  for (const f of ['boot.js', 'i18n-en.js', 'i18n-vi.js', 'i18n.js']) vm.runInContext(load(f), context, { filename: f });
  return { root, window, stored, reloaded: () => reloaded };
}

test('Vietnamese uses the persisted locale and translates supported labels', () => {
  const { root, window } = fixture('vi');
  assert.equal(root.lang, 'vi-VN');
  assert.equal(window.lfLang(), 'vi');
  assert.equal(window.lfTranslate('首页'), 'Trang chủ');
  assert.equal(window.lfT('登录', 'Sign in'), 'Đăng nhập');
  assert.equal(window.lfTranslate('https://example.com/api'), 'https://example.com/api');
});
test('language selection persists Vietnamese and reloads in reduced-motion mode', () => {
  const f = fixture('en');
  f.window.lfSetLang('vi');
  assert.equal(f.stored.get('loopforge.lang'), 'vi');
  assert.equal(f.reloaded(), true);
});
test('existing English and Chinese preferences still work', () => {
  const en = fixture('en');
  assert.equal(en.window.lfTranslate('首页'), 'Home');
  assert.equal(en.window.lfT('登录', 'Sign in'), 'Sign in');
  const zh = fixture('zh');
  assert.equal(zh.root.lang, 'zh-CN');
  assert.equal(zh.window.lfT('登录', 'Sign in'), '登录');
  assert.equal(fixture('invalid').root.lang, 'zh-CN');
});
test('Vietnamese catalogue only contains real source keys and nonempty translations', () => {
  const { window } = fixture('vi');
  for (const [key, value] of Object.entries(window.LF_I18N_VI)) {
    assert.ok(Object.hasOwn(window.LF_I18N_EN, key), key);
    assert.ok(value.trim(), key);
  }
  assert.deepEqual(Object.keys(window.LF_I18N_VI).sort(), Object.keys(window.LF_I18N_EN).sort());
});

test('Vietnamese dynamic messages preserve values and localize units', () => {
  const { window } = fixture('vi');
  for (const [source, expected] of [
  [
    "第 12 阶段",
    "Giai đoạn 12"
  ],
  [
    "第 3 轮",
    "Lượt 3"
  ],
  [
    "入 123 / 出 456",
    "Vào 123 / Ra 456"
  ],
  [
    "2026年11月",
    "Tháng 11/2026"
  ],
  [
    "12月",
    "Tháng 12"
  ],
  [
    "2026-11-01 至 2026-11-22",
    "2026-11-01 – 2026-11-22"
  ],
  [
    "3次",
    "3 lần"
  ],
  [
    "4步",
    "4 bước"
  ],
  [
    " · 高 · ",
    " · Cao · "
  ]
]) {
    assert.equal(window.lfTranslate(source), expected);
  }
});
