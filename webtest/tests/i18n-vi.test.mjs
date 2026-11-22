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

// Cover the dynamically rendered credential/model catalog and project/SOP forms.
test('Vietnamese translates credential, model, workflow and project wizard labels', () => {
  const { window } = fixture('vi');
  for (const [source, expected] of [
  [
    "恢复自动",
    "Khôi phục chế độ tự động"
  ],
  [
    "最多同时运行条数",
    "Số lượt chạy đồng thời tối đa"
  ],
  [
    "请填写 GitHub",
    "Vui lòng nhập"
  ],
  [
    "个人访问令牌（PAT）",
    "token truy cập cá nhân (PAT) của GitHub"
  ],
  [
    "新建令牌，为目标仓库授予",
    "Tạo token và cấp cho kho mã đích quyền"
  ],
  [
    "和",
    "và"
  ],
  [
    "的读写权限",
    "với quyền đọc/ghi"
  ],
  [
    "开头的 Key",
    "ở đầu"
  ],
  [
    "，为目标仓库授予",
    ", đồng thời cấp cho kho mã đích"
  ],
  [
    "的读写权限；少勾权限会导致克隆 / 推送仓库失败。",
    "quyền đọc/ghi. Thiếu quyền sẽ khiến thao tác clone hoặc push kho mã thất bại."
  ],
  [
    "接口协议",
    "Giao thức API"
  ],
  [
    "Base URL 提供的 API",
    "API do Base URL cung cấp"
  ],
  [
    "可选强度",
    "Mức độ suy luận khả dụng"
  ],
  [
    "思考强度配置",
    "Cấu hình mức độ suy luận"
  ],
  [
    "勾选此模型支持的强度；全部取消时仅使用模型默认强度。",
    "Chọn các mức độ suy luận mà mô hình hỗ trợ. Bỏ chọn tất cả để chỉ sử dụng mức mặc định của mô hình."
  ],
  [
    "拖动排序，也可以按 ↑ ↓ 移动",
    "Kéo để sắp xếp hoặc dùng phím ↑ ↓ để di chuyển"
  ],
  [
    "模型 ID，如 gpt-5.5",
    "ID mô hình, ví dụ gpt-5.5"
  ],
  [
    "模型 ID",
    "ID mô hình"
  ],
  [
    "移除模型",
    "Xóa mô hình"
  ],
  [
    "模型目录",
    "Danh mục mô hình"
  ],
  [
    "获取可用模型",
    "Lấy danh sách mô hình khả dụng"
  ],
  [
    "添加模型",
    "Thêm mô hình"
  ],
  [
    "恢复默认",
    "Khôi phục mặc định"
  ],
  [
    "已在目录",
    "Đã có trong danh mục"
  ],
  [
    "全选",
    "Chọn tất cả"
  ],
  [
    "可用模型",
    "Mô hình khả dụng"
  ],
  [
    "更新列表",
    "Cập nhật danh sách"
  ],
  [
    "显示",
    "Hiện"
  ],
  [
    "隐藏",
    "Ẩn"
  ],
  [
    "缺少此权限",
    "Thiếu quyền này"
  ],
  [
    "尚未校验",
    "Chưa xác minh"
  ],
  [
    "权限",
    "Quyền"
  ],
  [
    "校验后显示",
    "Hiển thị sau khi xác minh"
  ],
  [
    "最近校验",
    "Xác minh gần nhất"
  ],
  [
    "手动更换令牌",
    "Thay token thủ công"
  ],
  [
    "删除凭证",
    "Xóa thông tin xác thực"
  ],
  [
    "校验并保存",
    "Xác minh và lưu"
  ],
  [
    "重新校验",
    "Xác minh lại"
  ],
  [
    "正在读取执行器…",
    "Đang tải trình thực thi…"
  ],
  [
    "保存设置",
    "Lưu cài đặt"
  ],
  [
    "要添加哪一项凭证？",
    "Bạn muốn thêm thông tin xác thực nào?"
  ],
  [
    "选择一项 · 已配置的可在列表中编辑",
    "Chọn một mục · có thể chỉnh sửa các mục đã cấu hình trong danh sách"
  ],
  [
    "已全部配置，可在列表中编辑。",
    "Đã cấu hình tất cả thông tin xác thực. Bạn có thể chỉnh sửa trong danh sách."
  ],
  [
    "GitHub 连接方式",
    "Phương thức kết nối GitHub"
  ],
  [
    "GitHub 授权",
    "Ủy quyền GitHub"
  ],
  [
    "访问令牌",
    "Token truy cập"
  ],
  [
    "连接 GitHub",
    "Kết nối GitHub"
  ],
  [
    "连接后可选择仓库，用于克隆代码、创建分支和推送交付产物。",
    "Sau khi kết nối, bạn có thể chọn kho mã để clone mã nguồn, tạo nhánh và push sản phẩm bàn giao."
  ],
  [
    "如何获取密钥",
    "Cách lấy khóa"
  ],
  [
    "下一次运行你负责的任务时生效，可随时在列表中展开编辑。",
    "Có hiệu lực từ lần chạy tiếp theo của tác vụ do bạn phụ trách. Bạn có thể mở rộng mục trong danh sách để chỉnh sửa bất cứ lúc nào."
  ],
  [
    "确认并保存",
    "Xác nhận và lưu"
  ],
  [
    "密钥只在任务运行时注入，不写入 Agent 资产",
    "Khóa chỉ được cung cấp khi tác vụ chạy, không được ghi vào tài nguyên tác tử"
  ],
  [
    "密钥",
    "Khóa bí mật"
  ],
  [
    "已填写 ••••••••",
    "Đã nhập ••••••••"
  ],
  [
    "生效",
    "Có hiệu lực"
  ],
  [
    "下一次任务",
    "Tác vụ tiếp theo"
  ],
  [
    "仅为当前账号授权",
    "Chỉ ủy quyền cho tài khoản hiện tại"
  ],
  [
    "本地验收登录",
    "Đăng nhập kiểm thử nghiệm thu cục bộ"
  ],
  [
    "未认证",
    "Chưa xác thực"
  ],
  [
    "登录后可在「个人配置」添加 Git 凭据和执行器。",
    "Sau khi đăng nhập, bạn có thể thêm thông tin xác thực Git và trình thực thi trong Cài đặt cá nhân."
  ],
  [
    "通过账号登录",
    "Đăng nhập bằng tài khoản"
  ],
  [
    "外观",
    "Giao diện"
  ],
  [
    "没有需要你处理的需求",
    "Không có yêu cầu nào cần bạn xử lý"
  ],
  [
    "当前没有进行中的需求",
    "Hiện không có yêu cầu nào đang thực hiện"
  ],
  [
    "还没有跑完的需求",
    "Chưa có yêu cầu nào hoàn tất"
  ],
  [
    "前往 GitHub 申请个人访问令牌",
    "Truy cập GitHub để tạo token truy cập cá nhân"
  ],
  [
    "复制令牌粘贴到下方，保存前会自动校验权限",
    "Sao chép và dán token bên dưới. Quyền sẽ được tự động xác minh trước khi lưu."
  ],
  [
    "保存前会先校验令牌有效性与权限",
    "Hiệu lực và quyền của token sẽ được xác minh trước khi lưu"
  ],
  [
    "依赖私有仓库的 SOP 将无法克隆或推送仓库。",
    "Các SOP phụ thuộc vào kho mã riêng tư sẽ không thể clone hoặc push lên các kho mã đó."
  ],
  [
    "使用官方地址时，选择 CodeBuddy 账号所在的网络环境",
    "Khi dùng địa chỉ chính thức, chọn môi trường mạng của tài khoản CodeBuddy"
  ],
  [
    "使用自定义网关时，填写网关提供的 Base URL 和 API Key",
    "Khi sử dụng gateway tùy chỉnh, nhập Base URL và API Key do gateway cung cấp"
  ],
  [
    "请输入个人 ck_ key",
    "Nhập khóa ck_ cá nhân"
  ],
  [
    "CodeBuddy 会使用可用的共享配置。其他 CLI 继续使用各自的凭据。",
    "CodeBuddy sẽ sử dụng cấu hình dùng chung khả dụng. Các CLI khác tiếp tục sử dụng thông tin xác thực riêng."
  ],
  [
    "AI 对话切换到 Codex 后可选用模型目录里的模型，SOP 在执行机器上以 Codex 运行的节点也使用它。目录为空时，未填 Base URL 使用 Codex 自带模型，填写后跟随服务发布的模型；也可以自己挑选、排序和命名。",
    "Khi chuyển cuộc trò chuyện AI sang Codex, bạn có thể chọn mô hình trong danh mục. Các bước SOP chạy Codex trên máy thực thi cũng dùng danh mục này. Nếu danh mục trống, khi không nhập Base URL sẽ dùng mô hình tích hợp của Codex; nếu đã nhập, sẽ dùng mô hình do dịch vụ cung cấp. Bạn cũng có thể tự chọn, sắp xếp và đặt tên mô hình."
  ],
  [
    "在模型服务商控制台创建 API Key",
    "Tạo API Key trong bảng điều khiển của nhà cung cấp mô hình"
  ],
  [
    "如走代理或私有网关，记下服务地址",
    "Nếu dùng proxy hoặc gateway riêng, hãy ghi lại địa chỉ dịch vụ"
  ],
  [
    "粘贴 Key，按需填写 Base URL；保存后可在模型目录里挑选 AI 对话的模型",
    "Dán khóa và nhập Base URL nếu cần. Sau khi lưu, bạn có thể chọn mô hình trò chuyện AI trong danh mục."
  ],
  [
    "以 Codex 运行的 SOP 节点将无法执行，Base URL 与模型目录一并清空。",
    "Các bước SOP sử dụng Codex sẽ không thể thực thi. Base URL và danh mục mô hình cũng sẽ bị xóa."
  ],
  [
    "AI 对话切换到 Claude Code 后可选用模型目录里的模型，SOP 在执行机器上以 Claude Code 运行的节点也使用它。目录为空时，未填 Base URL 使用 Claude Code 自带模型，填写后跟随服务发布的模型；也可以自己挑选、排序和命名。",
    "Khi chuyển cuộc trò chuyện AI sang Claude Code, bạn có thể chọn mô hình trong danh mục. Các bước SOP chạy Claude Code trên máy thực thi cũng dùng danh mục này. Nếu danh mục trống, khi không nhập Base URL sẽ dùng mô hình tích hợp của Claude Code; nếu đã nhập, sẽ dùng mô hình do dịch vụ cung cấp. Bạn cũng có thể tự chọn, sắp xếp và đặt tên mô hình."
  ],
  [
    "以 Claude Code 运行的 SOP 节点将无法执行，Base URL 与模型目录一并清空。",
    "Các bước SOP sử dụng Claude Code sẽ không thể thực thi. Base URL và danh mục mô hình cũng sẽ bị xóa."
  ],
  [
    "OpenCode 没有自己的模型服务，需要填写 Base URL。",
    "OpenCode không có dịch vụ mô hình riêng nên cần nhập Base URL."
  ],
  [
    "Cursor CLI 连接 Cursor 官方服务，可按账号获取模型。",
    "Cursor CLI kết nối tới dịch vụ chính thức của Cursor và có thể lấy danh sách mô hình theo tài khoản."
  ],
  [
    "登录 Cursor 控制台，在「Integrations → User API Keys」新建 Key",
    "Đăng nhập bảng điều khiển Cursor và tạo khóa tại Integrations → User API Keys"
  ],
  [
    "前往 Cursor 创建 API Key",
    "Truy cập Cursor để tạo API Key"
  ],
  [
    "粘贴到下方保存",
    "Dán bên dưới rồi lưu"
  ],
  [
    "默认连接 Gemini 官方服务；选择 OpenAI 兼容网关时需要填写 Base URL。",
    "Mặc định kết nối dịch vụ chính thức của Gemini. Nếu chọn gateway tương thích OpenAI, cần nhập Base URL."
  ],
  [
    "OpenAI 兼容网关必填",
    "Bắt buộc đối với gateway tương thích OpenAI"
  ],
  [
    "在 Google AI Studio 创建 Gemini API Key，或准备 OpenAI 兼容网关的 Key",
    "Tạo Gemini API Key trong Google AI Studio hoặc chuẩn bị khóa của gateway tương thích OpenAI"
  ],
  [
    "前往 Google AI Studio",
    "Truy cập Google AI Studio"
  ],
  [
    "走网关时记下网关地址",
    "Nếu dùng gateway, hãy ghi lại địa chỉ gateway"
  ],
  [
    "粘贴 Key，选择协议；保存后可在模型目录里挑选 AI 对话的模型",
    "Dán khóa và chọn giao thức. Sau khi lưu, bạn có thể chọn mô hình trò chuyện AI trong danh mục."
  ],
  [
    "OpenAI 兼容网关（Chat Completions）",
    "Gateway tương thích OpenAI (Chat Completions)"
  ],
  [
    "未填写 Base URL 时连接 Kimi Code 官方服务。",
    "Kết nối dịch vụ chính thức của Kimi Code nếu để trống Base URL."
  ],
  [
    "Pi 没有自己的模型服务，需要填写 Base URL。",
    "Pi không có dịch vụ mô hình riêng nên cần nhập Base URL."
  ],
  [
    "未填写 Base URL 时连接 DeepSeek 官方服务。",
    "Kết nối dịch vụ chính thức của DeepSeek nếu để trống Base URL."
  ],
  [
    "未填写 Base URL 时连接智谱 BigModel 的 Anthropic 兼容服务（Messages）。",
    "Kết nối dịch vụ tương thích Anthropic (Messages) của Zhipu BigModel nếu để trống Base URL."
  ],
  [
    "记下服务地址和它提供的接口协议",
    "Ghi lại địa chỉ dịch vụ và giao thức API mà dịch vụ cung cấp"
  ],
  [
    "粘贴 Key，按需填写 Base URL 并选择协议；保存后可在模型目录里挑选 AI 对话的模型",
    "Dán khóa, nhập Base URL nếu cần và chọn giao thức. Sau khi lưu, bạn có thể chọn mô hình trò chuyện AI trong danh mục."
  ],
  [
    "，Base URL、协议与模型目录一并清空",
    ", đồng thời Base URL, giao thức và danh mục mô hình sẽ bị xóa"
  ],
  [
    "模型 ID 不能为空",
    "ID mô hình không được để trống"
  ],
  [
    "模型 ID 不能超过 128 个字符",
    "ID mô hình không được vượt quá 128 ký tự"
  ],
  [
    "显示名称不能超过 64 个字符",
    "Tên hiển thị không được vượt quá 64 ký tự"
  ],
  [
    "仅使用默认",
    "Chỉ dùng mặc định"
  ],
  [
    "该 CLI",
    "CLI này"
  ],
  [
    "使用执行机器的账号模型",
    "Dùng mô hình của tài khoản trên máy thực thi"
  ],
  [
    "获取这台机器的账号模型，或手动添加。",
    "Lấy danh sách mô hình của tài khoản trên máy này hoặc thêm thủ công."
  ],
  [
    "清空自定义列表",
    "Xóa danh sách tùy chỉnh"
  ],
  [
    "已清空目录，保存后生效",
    "Đã xóa danh mục. Thay đổi có hiệu lực sau khi lưu"
  ],
  [
    "清空目录，改回使用自带的模型",
    "Xóa danh mục và dùng lại các mô hình tích hợp"
  ],
  [
    "已恢复默认，保存后使用自带的模型",
    "Đã khôi phục mặc định. Các mô hình tích hợp sẽ được dùng sau khi lưu"
  ],
  [
    "跟随服务发布的模型",
    "Dùng mô hình do dịch vụ cung cấp"
  ],
  [
    "清空目录，改回跟随服务发布的模型",
    "Xóa danh mục và dùng lại mô hình do dịch vụ cung cấp"
  ],
  [
    "已恢复默认，保存后跟随服务发布的模型",
    "Đã khôi phục mặc định. Mô hình do dịch vụ cung cấp sẽ được dùng sau khi lưu"
  ],
  [
    "未自定义",
    "Chưa tùy chỉnh"
  ],
  [
    "已移除模型，保存后生效",
    "Đã xóa mô hình. Thay đổi có hiệu lực sau khi lưu"
  ],
  [
    "CLI 内置模型",
    "Mô hình tích hợp của CLI"
  ],
  [
    "来自官方服务",
    "Từ dịch vụ chính thức"
  ],
  [
    "来自这台机器的账号登录",
    "Từ tài khoản đăng nhập trên máy này"
  ],
  [
    "全不选",
    "Bỏ chọn tất cả"
  ],
  [
    "获取中",
    "Đang lấy dữ liệu"
  ],
  [
    "服务没有返回可用模型",
    "Dịch vụ không trả về mô hình khả dụng nào"
  ],
  [
    "Base URL 已更换，原模型目录已清空，保存后生效",
    "Base URL đã thay đổi và danh mục mô hình cũ đã bị xóa. Thay đổi có hiệu lực sau khi lưu."
  ],
  [
    "请填写 Base URL",
    "Vui lòng nhập Base URL"
  ],
  [
    "请填写以 http:// 或 https:// 开头的地址，地址内不可包含账号密码、查询参数或片段",
    "Nhập địa chỉ bắt đầu bằng http:// hoặc https://, không chứa tên tài khoản, mật khẩu, tham số truy vấn hoặc fragment"
  ],
  [
    "可选 · 留空使用网络环境的官方地址",
    "Tùy chọn · để trống để dùng địa chỉ chính thức của môi trường mạng"
  ],
  [
    "校验中",
    "Đang xác minh"
  ],
  [
    "有错误",
    "Có lỗi"
  ],
  [
    "保存后替换当前的令牌，对下一次任务生效",
    "Token hiện tại sẽ được thay thế sau khi lưu, có hiệu lực từ tác vụ tiếp theo"
  ],
  [
    "工蜂授权 · 到期自动续期",
    "Ủy quyền Gongfeng · tự động gia hạn khi hết hạn"
  ],
  [
    "GitHub 授权 / 个人访问令牌",
    "Ủy quyền GitHub / token truy cập cá nhân"
  ],
  [
    "重新授权",
    "Ủy quyền lại"
  ],
  [
    "新的个人访问令牌",
    "Token truy cập cá nhân mới"
  ],
  [
    "保存前会校验有效性与权限",
    "Hiệu lực và quyền được xác minh trước khi lưu"
  ],
  [
    "粘贴 GitHub 个人访问令牌（PAT）",
    "Dán token truy cập cá nhân (PAT) của GitHub"
  ],
  [
    "官方地址使用",
    "Dùng cho địa chỉ chính thức"
  ],
  [
    "留空使用官方地址",
    "Để trống để dùng địa chỉ chính thức"
  ],
  [
    "已配置 · 留空则不改",
    "Đã cấu hình · để trống nếu không thay đổi"
  ],
  [
    "输入新值以替换",
    "Nhập giá trị mới để thay thế"
  ],
  [
    "完全权限",
    "Toàn quyền truy cập"
  ],
  [
    "极低",
    "Rất thấp"
  ],
  [
    "极高",
    "Rất cao"
  ],
  [
    "最大",
    "Tối đa"
  ],
  [
    "当前账号暂无可用执行器",
    "Tài khoản hiện tại chưa có trình thực thi khả dụng"
  ],
  [
    "保存中",
    "Đang lưu"
  ],
  [
    "Git 令牌校验通过",
    "Đã xác minh token Git"
  ],
  [
    "Git Token 校验未通过",
    "Xác minh token Git thất bại"
  ],
  [
    "Git Token 校验通过，已保存",
    "Đã xác minh và lưu token Git"
  ],
  [
    "删除中",
    "Đang xóa"
  ],
  [
    "格式正确",
    "Định dạng hợp lệ"
  ],
  [
    "只在你负责的任务运行时注入，保存后不再明文展示",
    "Chỉ được cung cấp khi các tác vụ do bạn phụ trách chạy; không hiển thị dạng văn bản thuần sau khi lưu"
  ],
  [
    "用工蜂授权",
    "Ủy quyền qua Gongfeng"
  ],
  [
    "可选 · 留空使用官方地址",
    "Tùy chọn · để trống để dùng địa chỉ chính thức"
  ],
  [
    "使用访问令牌",
    "Sử dụng token truy cập"
  ],
  [
    "请先填写密钥",
    "Vui lòng nhập khóa trước"
  ],
  [
    "工蜂授权已保存",
    "Đã lưu ủy quyền Gongfeng"
  ],
  [
    "工蜂授权已保存，正在校验授权有效性…",
    "Đã lưu ủy quyền Gongfeng, đang xác minh hiệu lực…"
  ],
  [
    "已登录本地验收账号",
    "Đã đăng nhập tài khoản kiểm thử nghiệm thu cục bộ"
  ],
  [
    "Git SSH 主机信任",
    "Tin cậy máy chủ Git SSH"
  ],
  [
    "-- 个账号",
    "-- tài khoản"
  ],
  [
    "加载中",
    "Đang tải"
  ],
  [
    "加载账号失败",
    "Không tải được danh sách tài khoản"
  ],
  [
    "用户名需 2–64 位，以字母或数字开头，只能包含字母、数字、_ . -",
    "Tên người dùng phải có 2–64 ký tự, bắt đầu bằng chữ cái hoặc chữ số và chỉ chứa chữ cái, chữ số, _ . -"
  ],
  [
    "加载共享 Key 失败",
    "Không tải được khóa dùng chung"
  ],
  [
    "浅色",
    "Sáng"
  ],
  [
    "跟随系统",
    "Theo hệ thống"
  ],
  [
    "批准后才会继续跑",
    "Chỉ tiếp tục chạy sau khi được phê duyệt"
  ],
  [
    "已经完成",
    "Đã hoàn tất"
  ],
  [
    "本项目已闭环",
    "Đã hoàn thành quy trình trong dự án này"
  ],
  [
    "执行器",
    "Trình thực thi"
  ],
  [
    "跟随责任人默认模型",
    "Dùng mô hình mặc định của người phụ trách"
  ],
  [
    "暂无可选模型",
    "Chưa có mô hình để chọn"
  ],
  [
    "还没有打开流程",
    "Chưa mở quy trình nào"
  ],
  [
    "重命名步骤",
    "Đổi tên bước"
  ],
  [
    "拖到下一步",
    "Kéo tới bước tiếp theo"
  ],
  [
    "拖到失败时要打回的步骤",
    "Kéo tới bước cần quay lại khi thất bại"
  ],
  [
    "插入运行时变量",
    "Chèn biến tại thời điểm chạy"
  ],
  [
    "插入",
    "Chèn"
  ],
  [
    "打开后，运行会停在「待我确认」",
    "Khi bật, lượt chạy sẽ tạm dừng ở Cần rà soát"
  ],
  [
    "例如：MR 已创建",
    "Ví dụ: MR đã được tạo"
  ],
  [
    "由平台到代码托管平台核验，无需编写命令：本轮推送了新提交的每个仓库，都必须有从本轮工作分支到目标分支、且未关闭的 MR/PR。无法自动查询的平台会转人工确认。",
    "Nền tảng tự xác minh với dịch vụ lưu trữ mã nguồn, không cần viết lệnh. Mỗi kho mã có commit mới được push trong lượt chạy này phải có MR/PR chưa đóng từ nhánh làm việc tới nhánh đích. Nếu không thể truy vấn tự động, hệ thống sẽ chuyển sang xác nhận thủ công."
  ],
  [
    "开启后，这个角色运行时通过平台 MCP（agentflow-platform）直接调用平台侧功能：需求、任务、运行、项目等平台操作。",
    "Khi bật, vai trò này có thể gọi trực tiếp các chức năng nền tảng thông qua MCP (agentflow-platform) trong lúc chạy, bao gồm yêu cầu, tác vụ, lượt chạy và dự án."
  ],
  [
    "开启后，这个角色运行时可只读检索团队知识库（agentflow-knowledge），并自动附带「知识库使用规范」规则；产出的 knowledge.md 会进入知识沉淀审核队列。",
    "Khi bật, vai trò này có thể tra cứu cơ sở tri thức của nhóm (agentflow-knowledge) ở chế độ chỉ đọc khi chạy và tự động nhận quy tắc sử dụng cơ sở tri thức. Tệp knowledge.md được tạo sẽ đưa vào hàng đợi xét duyệt tri thức."
  ],
  [
    "主配置",
    "Cấu hình chính"
  ],
  [
    "运行到该节点时用所选模型构建静态站点，不必再手写脚本节点；Run 成功后平台归档预览。它只有成功出口。",
    "Khi thực thi bước này, mô hình đã chọn sẽ xây dựng trang web tĩnh mà không cần tự viết bước script. Sau khi lượt chạy thành công, nền tảng lưu trữ bản xem trước. Bước này chỉ có đầu ra thành công."
  ],
  [
    "从左侧「成功」出口连到下一步；预览节点没有失败出口",
    "Nối đầu ra Thành công ở bên trái tới bước tiếp theo. Bước xem trước không có đầu ra thất bại."
  ],
  [
    "交给下一步的产物",
    "Sản phẩm đầu ra chuyển cho bước tiếp theo"
  ],
  [
    "需要确认什么（可选）",
    "Nội dung cần xác nhận (tùy chọn)"
  ],
  [
    "例如：检查 MR 的改动范围和测试结果，确认可以上线",
    "Ví dụ: kiểm tra phạm vi thay đổi của MR và kết quả kiểm thử, xác nhận có thể triển khai."
  ],
  [
    "确认步骤会停在「待我确认」，批准后才继续；这段说明会和上下游一起展示给确认人。",
    "Bước xác nhận sẽ tạm dừng ở Cần rà soát và chỉ tiếp tục sau khi được phê duyệt. Nội dung này được hiển thị cho người phê duyệt cùng thông tin các bước trước và sau."
  ],
  [
    "重置目标步骤及其下游后重跑。也可以从节点的「失败打回」出口直接拖线。",
    "Đặt lại bước đích và các bước sau đó rồi chạy lại. Bạn cũng có thể kéo đường nối trực tiếp từ đầu ra Trả về khi thất bại."
  ],
  [
    "重试用尽后标记失败；运行页可以人工通过该节点继续下游。",
    "Đánh dấu thất bại khi hết số lần thử lại. Tại trang lượt chạy, có thể xác nhận thủ công bước này để tiếp tục các bước sau."
  ],
  [
    "工作区重建时先执行（脚本需可重复执行）",
    "Chạy trước khi tạo lại không gian làm việc (script phải có khả năng chạy lặp lại)"
  ],
  [
    "打开当前会话 ↗",
    "Mở cuộc trò chuyện hiện tại ↗"
  ],
  [
    "当前项目还没有 AI 定时任务，点击右上角「新建 AI 定时任务」。",
    "Dự án hiện chưa có tác vụ AI theo lịch. Chọn Tác vụ AI theo lịch mới ở góc trên bên phải."
  ],
  [
    "没有匹配的角色。",
    "Không có vai trò phù hợp."
  ],
  [
    "跟随责任人默认执行器",
    "Dùng trình thực thi mặc định của người phụ trách"
  ],
  [
    "已跳过",
    "Đã bỏ qua"
  ],
  [
    "· 可在项目设置补充",
    "· Có thể bổ sung trong cài đặt dự án"
  ],
  [
    "只需名称即可创建，再按步骤绑定仓库、邀请成员。",
    "Chỉ cần tên để tạo dự án, sau đó thực hiện các bước liên kết kho mã và mời thành viên."
  ],
  [
    "所有配置之后都能在项目设置里修改。",
    "Bạn có thể thay đổi mọi cấu hình sau này trong cài đặt dự án."
  ],
  [
    "可选，这个项目负责什么？Agent 会把它作为上下文。",
    "Tùy chọn: dự án này phụ trách công việc gì? Tác tử sẽ sử dụng thông tin này làm ngữ cảnh."
  ],
  [
    "默认 SOP 已就绪，现在就可以开始第一条需求。跳过的配置随时可以在项目设置里补充。",
    "SOP mặc định đã sẵn sàng. Bạn có thể bắt đầu yêu cầu đầu tiên ngay bây giờ. Các cấu hình đã bỏ qua có thể bổ sung bất cứ lúc nào trong cài đặt dự án."
  ],
  [
    "已生效配置",
    "Cấu hình đang có hiệu lực"
  ],
  [
    "开始第一条需求",
    "Bắt đầu yêu cầu đầu tiên"
  ],
  [
    "切换到该项目，去需求列表新建或导入需求",
    "Chuyển sang dự án này rồi tạo hoặc nhập yêu cầu trong danh sách yêu cầu"
  ],
  [
    "进入项目设置",
    "Mở cài đặt dự án"
  ],
  [
    "修改基本信息，补充仓库、成员和 TAPD",
    "Chỉnh sửa thông tin cơ bản, bổ sung kho mã, thành viên và TAPD"
  ],
  [
    "跳过此步",
    "Bỏ qua bước này"
  ],
  [
    "每个 HTTPS 主机配置一个个人访问令牌。平台与工作区访问该主机时，使用本轮责任人或发言人的凭据。",
    "Cấu hình một token truy cập cá nhân cho mỗi máy chủ HTTPS. Khi nền tảng hoặc không gian làm việc truy cập máy chủ đó, hệ thống sử dụng thông tin xác thực của người phụ trách lượt hiện tại hoặc người gửi tin nhắn."
  ],
  [
    "写清它是谁、做什么、按什么顺序、哪些事不能做。\n\n例如：你是 Issue 根因分析师，只分析不修改。读 Issue 和相关源码，把根因定位到具体文件和函数，写进 fix-plan.md。先复现，再缩小范围，最后给出修复步骤。不要改业务代码，也不要跑测试。",
    "Mô tả rõ tác tử là ai, làm gì, thực hiện theo thứ tự nào và không được làm những việc gì.\n\nVí dụ: Bạn là chuyên viên phân tích nguyên nhân gốc rễ của Issue. Chỉ phân tích, không sửa đổi. Đọc Issue và mã nguồn liên quan, xác định nguyên nhân ở tệp và hàm cụ thể rồi ghi vào fix-plan.md. Trước tiên tái hiện lỗi, sau đó thu hẹp phạm vi, cuối cùng đưa ra các bước sửa lỗi. Không chỉnh sửa mã nghiệp vụ hoặc chạy kiểm thử."
  ]
]) {
    assert.equal(window.lfTranslate(source), expected, source);
  }
});
