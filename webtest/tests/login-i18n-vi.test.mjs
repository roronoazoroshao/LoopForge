import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../web/login.js', import.meta.url), 'utf8');
async function exercise(source, locale, message) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {});
    return elements.get(id);
  };
  const form = get('loginForm');
  form.elements = { login: { value: 'alice' }, password: { value: 'bad' }, confirm: { value: 'bad' } };
  const document = { getElementById: get, documentElement: { dataset: {} } };
  const window = { lfLang: () => locale };
  const fetch = async url => url === '/api/auth/setup'
    ? { ok: true, json: async () => ({}) }
    : { ok: false, json: async () => ({ error: message }) };
  vm.runInNewContext(source, { document, window, fetch, location: { hash: '', replace() {} } });
  await form.onsubmit({ preventDefault() {}, currentTarget: form });
  return { message: get('loginError').textContent, disabled: get('loginSubmit').disabled };
}

for (const [locale, message, expected] of [
  [
    "vi",
    "Invalid username or password",
    "Tên người dùng hoặc mật khẩu không đúng"
  ],
  [
    "vi",
    "Too many attempts. Try again in a minute.",
    "Quá nhiều lần thử. Hãy thử lại sau một phút."
  ],
  [
    "vi",
    "invalid request origin",
    "Nguồn yêu cầu không hợp lệ"
  ],
  [
    "vi",
    "invalid login request",
    "Yêu cầu đăng nhập không hợp lệ"
  ],
  [
    "vi",
    "invalid registration request",
    "Yêu cầu đăng ký không hợp lệ"
  ],
  [
    "vi",
    "用户名需 2–64 位，以字母或数字开头，只能包含字母、数字、_ . -",
    "Tên người dùng phải có 2–64 ký tự, bắt đầu bằng chữ cái hoặc chữ số và chỉ chứa chữ cái, chữ số, _ . -"
  ],
  [
    "vi",
    "密码需 8–72 个字符",
    "Mật khẩu phải có 8–72 ký tự"
  ],
  [
    "vi",
    "自助注册已关闭，请联系管理员创建账号",
    "Tự đăng ký đã tắt. Liên hệ quản trị viên để tạo tài khoản."
  ],
  [
    "vi",
    "该用户名已被使用",
    "Tên người dùng này đã được sử dụng"
  ],
  [
    "vi",
    "constructor",
    "constructor"
  ],
  [
    "vi",
    "unrecognized server error",
    "unrecognized server error"
  ],
  [
    "en",
    "Invalid username or password",
    "Invalid username or password"
  ],
  [
    "zh",
    "Invalid username or password",
    "Invalid username or password"
  ]
]) {
  test(`login displays ${locale}: ${message}`, async () => {
    assert.deepEqual(await exercise(source, locale, message), { message: expected, disabled: false });
  });
}
