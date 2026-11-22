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

// Regression examples from real Vietnamese UI screenshots, Nov 2026.
test('Vietnamese translates previously uncatalogued settings and dashboard labels', () => {
  const { window } = fixture('vi');
  for (const [source, expected] of [
  [
    "用自己的电脑或 CVM 跑任务，未设默认时在云端执行。",
    "Chạy tác vụ trên máy tính của bạn hoặc CVM; nếu chưa đặt máy mặc định, tác vụ chạy trên đám mây."
  ],
  [
    "安装 CLI",
    "Cài đặt CLI"
  ],
  [
    "claude / codex 等",
    "claude / codex và các CLI khác"
  ],
  [
    "绑定码 10 分钟有效",
    "Mã liên kết có hiệu lực 10 phút"
  ],
  [
    "仅主动连接平台，不开放本机端口",
    "Chỉ kết nối đi tới nền tảng, không mở cổng trên máy cục bộ"
  ],
  [
    "在平台云端执行",
    "Chạy trên đám mây của nền tảng"
  ],
  [
    "还没有机器",
    "Chưa có máy thực thi"
  ],
  [
    "执行上方命令后自动出现",
    "Máy sẽ tự xuất hiện sau khi chạy lệnh phía trên"
  ],
  [
    "范围",
    "Phạm vi"
  ],
  [
    "搜索名称、描述或地址",
    "Tìm tên, mô tả hoặc địa chỉ"
  ],
  [
    "添加到",
    "Được thêm vào"
  ],
  [
    "为本项目接入工具",
    "Kết nối công cụ cho dự án này"
  ],
  [
    "创建个人专属配置",
    "Tạo cấu hình cá nhân"
  ],
  [
    "还没有访问密钥，创建后即可接入 REST API 和 MCP。",
    "Chưa có khóa truy cập. Tạo khóa để sử dụng REST API và MCP."
  ],
  [
    "项目是需求、仓库、团队和默认 SOP 的统一边界。点击项目进入详情配置。",
    "Dự án tập hợp yêu cầu, kho mã, nhóm và SOP mặc định. Nhấp vào dự án để mở cấu hình chi tiết."
  ],
  [
    "搜索项目名称、标识、Key 或仓库",
    "Tìm tên dự án, ID, Key hoặc kho mã"
  ],
  [
    "我参与的",
    "Tôi tham gia"
  ],
  [
    "待完善",
    "Cần hoàn thiện"
  ],
  [
    "未绑定代码仓库",
    "Chưa liên kết kho mã"
  ],
  [
    "机器人",
    "Bot"
  ],
  [
    "记录",
    "Bản ghi"
  ],
  [
    "还没有机器人。三步完成配置，随后在 SOP 设置或 AI 定时任务中选择这个 Bot。",
    "Chưa có bot. Hoàn tất cấu hình qua ba bước, sau đó chọn bot trong cài đặt SOP hoặc tác vụ AI theo lịch."
  ],
  [
    "填写凭据",
    "Nhập thông tin xác thực"
  ],
  [
    "选择接收会话",
    "Chọn cuộc trò chuyện nhận thông báo"
  ],
  [
    "发送测试",
    "Gửi thử"
  ],
  [
    "① 填写凭据",
    "① Nhập thông tin xác thực"
  ],
  [
    "名称、Bot ID 与 Secret",
    "Tên, Bot ID và Secret"
  ],
  [
    "② 选择接收会话",
    "② Chọn cuộc trò chuyện nhận thông báo"
  ],
  [
    "绑定单聊或群聊",
    "Liên kết trò chuyện cá nhân hoặc nhóm"
  ],
  [
    "③ 发送测试",
    "③ Gửi thử"
  ],
  [
    "确认消息能送达",
    "Xác nhận tin nhắn gửi thành công"
  ],
  [
    "开始添加",
    "Bắt đầu thêm"
  ],
  [
    "暂无进行中的运行",
    "Không có lượt chạy đang thực hiện"
  ],
  [
    "换个关键词，或到需求列表查看对应需求的执行结果。",
    "Thử từ khóa khác hoặc xem kết quả thực thi của yêu cầu tương ứng trong danh sách yêu cầu."
  ],
  [
    "AI 工作台里和你对话、帮你动手的助手。设置消息发送方式、角色与 SOP 的主动派发，以及每次对话都要遵守的规则；只对你自己生效。",
    "Trợ lý trò chuyện và thực hiện công việc trong không gian AI. Cài đặt cách gửi tin nhắn, chủ động điều phối vai trò và SOP, cùng quy tắc áp dụng cho mỗi cuộc trò chuyện; chỉ áp dụng cho bạn."
  ],
  [
    "消息发送",
    "Gửi tin nhắn"
  ],
  [
    "生成中发送消息",
    "Gửi tin nhắn khi đang tạo phản hồi"
  ],
  [
    "排队会等当前回复结束；立即发送会打断当前回复，保留已输出内容并继续处理新消息。",
    "Xếp hàng sẽ đợi phản hồi hiện tại kết thúc; gửi ngay sẽ ngắt phản hồi, giữ nội dung đã tạo và tiếp tục xử lý tin nhắn mới."
  ],
  [
    "排队",
    "Xếp hàng"
  ],
  [
    "立即发送",
    "Gửi ngay"
  ],
  [
    "例如：回复先给结论再给细节；改代码前先说明要改哪些文件；不要自动发起 MR。",
    "Ví dụ: Nêu kết luận trước chi tiết; giải thích các tệp cần sửa trước khi chỉnh mã; không tự động mở MR."
  ],
  [
    "更多",
    "Thêm"
  ],
  [
    "批量操作",
    "Thao tác hàng loạt"
  ],
  [
    "统计范围",
    "Phạm vi thống kê"
  ],
  [
    "口径说明",
    "Giải thích chỉ số"
  ],
  [
    "Vibe Coding 与协作",
    "Vibe Coding và cộng tác"
  ],
  [
    "数量按创建时间，Token 按回复时间 ·",
    "Số lượng theo thời điểm tạo, token theo thời điểm phản hồi ·"
  ],
  [
    "会话数",
    "Số cuộc trò chuyện"
  ],
  [
    "多人协作会话",
    "Cuộc trò chuyện nhiều người"
  ],
  [
    "协作会话 Token",
    "Token cuộc trò chuyện cộng tác"
  ],
  [
    "普通对话 · 含已归档会话",
    "Trò chuyện thông thường · gồm cuộc trò chuyện đã lưu trữ"
  ],
  [
    "按需求 ID 去重",
    "Loại trùng theo ID yêu cầu"
  ],
  [
    "已发起的 SOP 执行次数",
    "Số lượt chạy SOP đã khởi động"
  ],
  [
    "暂无会话",
    "Chưa có cuộc trò chuyện"
  ],
  [
    "SOP 产出与质量",
    "Sản phẩm và chất lượng SOP"
  ],
  [
    "投入 · SOP + 对话改代码",
    "Chi phí · SOP và sửa mã qua trò chuyện"
  ],
  [
    "缓存命中",
    "Tỷ lệ trúng bộ nhớ đệm"
  ],
  [
    "人民币 · Hy 上报 / 其他公价",
    "Nhân dân tệ · Hy báo cáo / giá niêm yết khác"
  ],
  [
    "缓存读",
    "Đọc bộ nhớ đệm"
  ],
  [
    "缓存写",
    "Ghi bộ nhớ đệm"
  ]
]) assert.equal(window.lfTranslate(source), expected, source);
});

// Inventory the static HTML text/attribute subset, including decoded line breaks.
// Dynamic templates and React strings require separate tests.
test('static console labels and attributes have Vietnamese catalogue entries', () => {
  const { window } = fixture('vi');
  const html = load('index.html');
  const matches = [...html.matchAll(/>([^<>{}\n]*[\u3400-\u9fff][^<>{}\n]*)</g), ...html.matchAll(/(?:placeholder|aria-label|title|data-meta)="([^"]*[\u3400-\u9fff][^"]*)"/g)];
  const missing = [...new Set(matches.map(match => match[1].trim().replaceAll('&#10;', '\n')).filter(source => source.length < 220 && !Object.hasOwn(window.LF_I18N_VI, source)))];
  assert.deepEqual(missing, []);
});
