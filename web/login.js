document.getElementById('loginTheme').onclick = () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('agentflow.theme.v3', next);
};

const $ = id => document.getElementById(id);
const t = window.lfT || ((zh) => zh);
let mode = 'login', signup = false;

const loginErrorsVi = {
  "code is required": "Bắt buộc cung cấp mã",
  "username is required": "Bắt buộc cung cấp tên người dùng",
  "invalid username": "Tên người dùng không hợp lệ",
  "photo not found": "Không tìm thấy ảnh",
  "Invalid username or password": "Tên người dùng hoặc mật khẩu không đúng",
  "Too many attempts. Try again in a minute.": "Quá nhiều lần thử. Hãy thử lại sau một phút.",
  "invalid request origin": "Nguồn yêu cầu không hợp lệ",
  "invalid login request": "Yêu cầu đăng nhập không hợp lệ",
  "invalid registration request": "Yêu cầu đăng ký không hợp lệ",
  "用户名需 2–64 位，以字母或数字开头，只能包含字母、数字、_ . -": "Tên người dùng phải có 2–64 ký tự, bắt đầu bằng chữ cái hoặc chữ số và chỉ chứa chữ cái, chữ số, _ . -",
  "自助注册已关闭，请联系管理员创建账号": "Tự đăng ký đã tắt. Liên hệ quản trị viên để tạo tài khoản.",
  "该用户名已被使用": "Tên người dùng này đã được sử dụng"
};
function displayLoginError(message) {
  if (window.lfLang?.() !== 'vi') return message;
  if (Object.hasOwn(loginErrorsVi, message)) return loginErrorsVi[message];
  const passwordLength = /^密码需 (\d+)–(\d+) 个字符$/.exec(message);
  return passwordLength ? `Mật khẩu phải có ${passwordLength[1]}–${passwordLength[2]} ký tự` : message;
}

function render() {
  const creating = mode !== 'login';
  $('loginSubtitle').textContent = mode === 'setup' ? t('创建管理员账号', 'Create the administrator account') : creating ? t('创建你的账号', 'Create your account') : t('登录你的交付工作台', 'Sign in to your delivery workspace');
  $('setupNotice').hidden = mode !== 'setup';
  $('confirmField').hidden = !creating;
  $('passwordRule').hidden = !creating;
  $('loginForm').elements.confirm.required = creating;
  $('loginForm').elements.password.autocomplete = creating ? 'new-password' : 'current-password';
  $('loginSubmit').textContent = mode === 'setup' ? t('创建并进入', 'Create and continue') : creating ? t('注册并进入', 'Sign up') : t('登录', 'Sign in');
  $('loginSwitch').hidden = mode === 'setup' || !signup;
  $('switchText').textContent = creating ? t('已有账号？', 'Already have an account?') : t('还没有账号？', 'No account yet?');
  $('switchMode').textContent = creating ? t('登录', 'Sign in') : t('注册', 'Sign up');
  $('loginContact').hidden = mode === 'setup' || signup;
  $('loginError').textContent = '';
}

$('switchMode').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; render(); };

fetch('/api/auth/setup').then(r => r.ok ? r.json() : {}).then(state => {
  signup = !!state.signupEnabled;
  if (state.needsSetup) mode = 'setup';
  else if (location.hash === '#register' && signup) mode = 'register';
  render();
}).catch(() => {});

$('loginForm').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget, button = $('loginSubmit'), error = $('loginError');
  const creating = mode !== 'login';
  if (creating && form.elements.password.value !== form.elements.confirm.value) {
    error.textContent = t('两次输入的密码不一致', 'Passwords do not match');
    return;
  }
  button.disabled = true;
  error.textContent = '';
  try {
    const response = await fetch(creating ? '/api/auth/register' : '/api/auth/password', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({login: form.elements.login.value.trim(), password: form.elements.password.value}),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || t('操作失败', 'Request failed'));
    location.replace('/');
  } catch (err) { error.textContent = displayLoginError(err.message); button.disabled = false; }
};
