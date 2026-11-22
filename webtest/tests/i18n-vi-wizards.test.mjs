import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const load = file => readFileSync(new URL('../../web/' + file, import.meta.url), 'utf8');
function fixture(lang='vi') {
  const window={confirm:()=>true,alert:()=>{},prompt:()=>null};
  const ctx=vm.createContext({window,document:{documentElement:{dataset:{lang},classList:{contains:()=>false}},readyState:'loading',addEventListener(){}},MutationObserver:class{}});
  for(const f of ['i18n-en.js','i18n-vi.js','i18n.js'])vm.runInContext(load(f),ctx);
  return window;
}
test('wizard and authorization strings from Vietnamese UI reports',()=>{
  const window=fixture();
  for(const [source,expected] of [
  [
    "在 GitHub 确认授权后，即可选择你的仓库。无需复制令牌。",
    "Sau khi cấp quyền trên GitHub, bạn có thể chọn kho mã mà không cần sao chép token."
  ],
  [
    "复制授权码，然后在 GitHub 确认：",
    "Sao chép mã cấp quyền, rồi xác nhận trên GitHub:"
  ],
  [
    "复制授权码",
    "Sao chép mã"
  ],
  [
    "复制并前往 GitHub 授权",
    "Sao chép và mở GitHub"
  ],
  [
    "正在检查授权服务…",
    "Đang kiểm tra dịch vụ cấp quyền…"
  ],
  [
    "授权仅用于当前账号，可随时撤销。",
    "Quyền chỉ áp dụng cho tài khoản hiện tại và có thể thu hồi bất cứ lúc nào."
  ],
  [
    "此实例已停用 GitHub 授权，可使用「访问令牌」连接仓库。",
    "Phiên bản này đã tắt cấp quyền GitHub. Hãy dùng token truy cập để kết nối kho mã."
  ],
  [
    "暂时无法检查授权服务，请稍后重试。",
    "Chưa thể kiểm tra dịch vụ cấp quyền. Hãy thử lại sau."
  ],
  [
    "正在获取 GitHub 授权码…",
    "Đang lấy mã cấp quyền GitHub…"
  ],
  [
    "已选中，按 Ctrl/⌘+C 复制",
    "Đã chọn. Nhấn Ctrl/⌘+C để sao chép"
  ],
  [
    "选择我的 GitHub 仓库",
    "Chọn kho mã GitHub"
  ],
  [
    "搜索已加载的仓库",
    "Tìm trong các kho mã đã tải"
  ],
  [
    "仓库名 / 组织名",
    "Tên kho mã / tổ chức"
  ],
  [
    "我的 GitHub 仓库",
    "Kho mã GitHub của tôi"
  ],
  [
    "未找到仓库，可手动填写地址；组织仓库可能需要管理员批准授权。",
    "Không tìm thấy kho mã. Hãy nhập URL thủ công; kho mã của tổ chức có thể cần quản trị viên phê duyệt."
  ],
  [
    "加载更多仓库",
    "Tải thêm kho mã"
  ],
  [
    "暂无可用执行器",
    "Chưa có trình thực thi"
  ],
  [
    "空白",
    "Tạo từ đầu"
  ],
  [
    "只填名称和模型，其余创建后再补",
    "Chỉ cần tên và mô hình; bổ sung phần còn lại sau."
  ],
  [
    "核对 PR、Checkers、Pipeline、验收与关闭证据",
    "Kiểm tra PR, các bước kiểm tra, pipeline và bằng chứng nghiệm thu, kết thúc."
  ],
  [
    "本项目规则",
    "Quy tắc dự án"
  ],
  [
    "本项目技能",
    "Kỹ năng dự án"
  ],
  [
    "本项目沙箱",
    "Sandbox của dự án"
  ],
  [
    "本项目Dockerfile",
    "Dockerfile của dự án"
  ],
  [
    "本项目环境安装脚本",
    "Tập lệnh cài đặt của dự án"
  ],
  [
    "共享规则",
    "Quy tắc dùng chung"
  ],
  [
    "共享沙箱",
    "Sandbox dùng chung"
  ],
  [
    "共享Dockerfile",
    "Dockerfile dùng chung"
  ],
  [
    "共享环境安装脚本",
    "Tập lệnh cài đặt dùng chung"
  ],
  [
    "没有需要你拍板的需求",
    "Không có yêu cầu cần bạn phê duyệt"
  ],
  [
    "流程停在人工确认节点时会出现在这里。",
    "Các lượt chạy dừng ở bước phê duyệt thủ công sẽ xuất hiện tại đây."
  ],
  [
    "个人对话",
    "Trò chuyện cá nhân"
  ],
  [
    "不绑定项目",
    "Không gắn dự án"
  ],
  [
    "未填写职责",
    "Chưa nhập trách nhiệm"
  ],
  [
    "绑定当前会话到此项目",
    "Gắn cuộc trò chuyện này với dự án"
  ],
  [
    "在此项目新开对话",
    "Trò chuyện mới trong dự án"
  ],
  [
    "未加入的项目",
    "Dự án chưa tham gia"
  ],
  [
    "已连接 GitHub",
    "Đã kết nối GitHub"
  ]
])assert.equal(window.lfTranslate(source),expected,source);
});
test('role presets populate localized editable values and clear when returning to blank',()=>{
  const code=load('app/agents.js');
  const presetSource=code.slice(code.indexOf('const agentPresets=['),code.indexOf('const AGENT_TABS='));
  const applySource=code.slice(code.indexOf('const agentPresetsVi='),code.indexOf('function showAgentPane'));
  const elements={name:{value:''},description:{value:''}};
  const state={agentCreatePreset:'blank',agentDraft:{prompt:''}};
  const messages=[];
  const apply=vm.runInNewContext(presetSource+applySource+'\napplyAgentPreset;', {window:fixture(),state,$:s=>s==='#agentForm'?{elements}:null,$$:()=>[],renderAgentTaskBook(){},syncAgentSlug(){},renderAgentSummary(){},toast:m=>messages.push(m)});
  for(const [id,title] of [["developer","Kỹ sư phần mềm"],["reviewer","Chuyên viên rà soát mã độc lập"],["tester","Kỹ sư kiểm thử độc lập"],["coordinator","Điều phối viên bàn giao"]]){
    apply(id);assert.equal(elements.name.value,title);assert.doesNotMatch(elements.description.value,/[\u3400-\u9fff]/);assert.doesNotMatch(state.agentDraft.prompt,/[\u3400-\u9fff]/);assert.doesNotMatch(messages.at(-1),/[\u3400-\u9fff]/);
  }
  apply('blank');assert.equal(elements.name.value,'');assert.equal(elements.description.value,'');assert.equal(state.agentDraft.prompt,'');
});

test('secondary workflow screens have Vietnamese labels',()=>{
  const window=fixture();
  for(const [source,expected] of [
  [
    "请选择仓库",
    "Chọn kho mã"
  ],
  [
    "重新检查",
    "Kiểm tra lại"
  ],
  [
    "请选择模型或填写模型 ID",
    "Chọn mô hình hoặc nhập ID mô hình"
  ],
  [
    "为什么需要人工确认",
    "Vì sao cần phê duyệt thủ công"
  ],
  [
    "逐条执行原有审批，结果会汇总",
    "Xử lý từng mục phê duyệt và tổng hợp kết quả"
  ],
  [
    "批量退回上游",
    "Trả về bước trước hàng loạt"
  ],
  [
    "批量通过",
    "Phê duyệt hàng loạt"
  ],
  [
    "选中后可批量处理",
    "Chọn các mục để xử lý hàng loạt"
  ],
  [
    "选中这条待确认",
    "Chọn mục chờ phê duyệt này"
  ],
  [
    "运行正在排队，请先取消排队",
    "Lượt chạy đang xếp hàng; hãy hủy xếp hàng trước"
  ],
  [
    "请先勾选要批量通过的条目",
    "Hãy chọn các mục cần phê duyệt hàng loạt"
  ],
  [
    "请先勾选要批量退回的条目",
    "Hãy chọn các mục cần trả về hàng loạt"
  ],
  [
    "选中的运行都没有配置上游返工目标，只能逐条处理",
    "Các lượt chạy đã chọn chưa có bước làm lại phía trước; chỉ có thể xử lý từng mục"
  ],
  [
    "预览构建节点没有失败出口",
    "Bước build bản xem trước không có nhánh xử lý thất bại"
  ],
  [
    "不能打回到自己",
    "Không thể trả lại chính bước này"
  ],
  [
    "本轮回答已提交",
    "Đã gửi câu trả lời lượt này"
  ],
  [
    "正在加载关联会话…",
    "Đang tải cuộc trò chuyện liên kết…"
  ],
  [
    "同步到 TAPD",
    "Đồng bộ sang TAPD"
  ],
  [
    "从 TAPD 同步",
    "Đồng bộ từ TAPD"
  ],
  [
    "对话交付",
    "Bàn giao qua trò chuyện"
  ],
  [
    "对话已删除",
    "Cuộc trò chuyện đã bị xóa"
  ],
  [
    "打开会话 ↗",
    "Mở cuộc trò chuyện ↗"
  ],
  [
    "工作区记录已清理，没有仓库和分支信息",
    "Đã dọn bản ghi không gian làm việc; không còn thông tin kho mã và nhánh"
  ],
  [
    "没有工作分支记录",
    "Không có bản ghi nhánh làm việc"
  ],
  [
    "直接提交在这个分支上",
    "Commit trực tiếp trên nhánh này"
  ],
  [
    "查看改动 ↗",
    "Xem thay đổi ↗"
  ],
  [
    "对话工作区直接改代码，没有 SOP 运行",
    "Sửa mã trực tiếp trong không gian trò chuyện, không chạy SOP"
  ],
  [
    "对话工作区检出的仓库",
    "Kho mã được checkout trong không gian trò chuyện"
  ],
  [
    "在对话工作区里直接改代码，没有 SOP 运行",
    "Sửa mã trực tiếp trong không gian trò chuyện, không chạy SOP"
  ],
  [
    "没有关联的会话",
    "Không có cuộc trò chuyện liên kết"
  ],
  [
    "对话需求在会话里直接改代码，不产出 SOP 节点产物。",
    "Yêu cầu qua trò chuyện sửa mã trực tiếp, không tạo sản phẩm đầu ra của các bước SOP."
  ],
  [
    "改动见「代码交付」，过程见会话记录。",
    "Xem thay đổi ở mục Bàn giao mã; xem quá trình trong lịch sử trò chuyện."
  ],
  [
    "验收方式",
    "Cách nghiệm thu"
  ],
  [
    "对话需求没有 SOP 验收门禁",
    "Yêu cầu qua trò chuyện không có điểm kiểm soát nghiệm thu SOP"
  ],
  [
    "创建这个需求的对话已删除",
    "Cuộc trò chuyện tạo yêu cầu này đã bị xóa"
  ],
  [
    "不是你创建的对话以只读方式打开",
    "Cuộc trò chuyện không do bạn tạo sẽ mở ở chế độ chỉ đọc"
  ],
  [
    "目标分支",
    "Nhánh đích"
  ],
  [
    "选择 SOP",
    "Chọn SOP"
  ],
  [
    "仅 TAPD 来源的需求支持重新同步",
    "Chỉ yêu cầu có nguồn từ TAPD mới hỗ trợ đồng bộ lại"
  ],
  [
    "已从 TAPD 同步最新内容",
    "Đã đồng bộ nội dung mới nhất từ TAPD"
  ],
  [
    "正在批量删除需求，请稍候",
    "Đang xóa yêu cầu hàng loạt…"
  ],
  [
    "仅展示你有权限访问的会话。私人会话仍仅自己可见。",
    "Chỉ hiển thị cuộc trò chuyện bạn có quyền truy cập. Cuộc trò chuyện riêng tư vẫn chỉ hiển thị với chủ sở hữu."
  ],
  [
    "围绕此需求新建会话",
    "Tạo cuộc trò chuyện về yêu cầu này"
  ],
  [
    "还没有可见的关联会话",
    "Chưa có cuộc trò chuyện liên kết nào có thể xem"
  ],
  [
    "加载关联会话失败：",
    "Không tải được cuộc trò chuyện liên kết:"
  ],
  [
    "这条需求不使用 SOP",
    "Yêu cầu này không dùng SOP"
  ],
  [
    "这条需求不使用 SOP，在对话里澄清和改代码",
    "Yêu cầu này không dùng SOP; làm rõ và sửa mã trong cuộc trò chuyện"
  ],
  [
    "上周无数据",
    "Tuần trước không có dữ liệu"
  ],
  [
    "与上周持平",
    "Không đổi so với tuần trước"
  ],
  [
    "较上周",
    "So với tuần trước"
  ],
  [
    "最近 7 天无执行",
    "Không có lượt thực thi trong 7 ngày qua"
  ],
  [
    "已结束的执行",
    "Lượt thực thi đã kết thúc"
  ],
  [
    "AI 回复",
    "Phản hồi AI"
  ],
  [
    "派发运行",
    "Điều phối lượt chạy"
  ],
  [
    "会话已清理",
    "Cuộc trò chuyện đã được dọn"
  ],
  [
    "打开会话",
    "Mở cuộc trò chuyện"
  ],
  [
    "未派发",
    "Chưa điều phối"
  ],
  [
    "触发时间",
    "Thời điểm kích hoạt"
  ],
  [
    "每页",
    "Mỗi trang"
  ],
  [
    "这次执行的会话已被清理（超出任务的保留会话数或保留期限，或被手动删除），无法再打开；AI 回复仍可在详情里查看",
    "Cuộc trò chuyện của lượt thực thi này đã bị dọn (vượt giới hạn số lượng, thời hạn lưu giữ hoặc bị xóa thủ công) nên không thể mở lại. Vẫn có thể xem phản hồi AI trong phần chi tiết."
  ],
  [
    "在新标签页打开本次执行的对话",
    "Mở cuộc trò chuyện của lượt thực thi trong tab mới"
  ],
  [
    "这次没有派发需求，没有运行可查看",
    "Không có yêu cầu được điều phối nên không có lượt chạy để xem"
  ],
  [
    "展开详情",
    "Mở chi tiết"
  ],
  [
    "从开始到结束的时长；进行中的执行不计",
    "Thời lượng từ lúc bắt đầu đến kết thúc; không tính lượt đang thực hiện"
  ],
  [
    "本次 AI 调用上报的总量，包含重试；不含下游 SOP，缓存明细不重复计入",
    "Tổng lượng sử dụng do lượt gọi AI này báo cáo, gồm cả thử lại; không tính SOP phía sau và không tính trùng bộ nhớ đệm"
  ],
  [
    "每页条数",
    "Số mục mỗi trang"
  ],
  [
    "执行记录分页",
    "Phân trang lịch sử thực thi"
  ],
  [
    "复制最近一次失败的 Trace ID 与排障信息",
    "Sao chép Trace ID và thông tin khắc phục sự cố gần nhất"
  ],
  [
    "没有匹配的共享任务，试试其他关键词。",
    "Không có tác vụ dùng chung phù hợp. Hãy thử từ khóa khác."
  ],
  [
    "正在读取订阅版本…",
    "Đang tải phiên bản đăng ký…"
  ],
  [
    "查看 / 切换版本",
    "Xem / đổi phiên bản"
  ],
  [
    "请选择",
    "Vui lòng chọn"
  ],
  [
    "是",
    "Có"
  ],
  [
    "否",
    "Không"
  ],
  [
    "此版本没有业务参数。",
    "Phiên bản này không có tham số nghiệp vụ."
  ],
  [
    "执行提示词预览",
    "Xem trước prompt thực thi"
  ],
  [
    "参数名",
    "Tên tham số"
  ],
  [
    "默认值",
    "Giá trị mặc định"
  ],
  [
    "目标版本",
    "Phiên bản đích"
  ],
  [
    "提示词和参数对比",
    "So sánh prompt và tham số"
  ],
  [
    "停滞天数",
    "Số ngày đình trệ"
  ],
  [
    "参数类型",
    "Kiểu tham số"
  ],
  [
    "删除参数",
    "Xóa tham số"
  ],
  [
    "目标订阅版本",
    "Phiên bản đăng ký đích"
  ],
  [
    "正在读取发布版本…",
    "Đang tải phiên bản đã phát hành…"
  ],
  [
    "项目已切换，请重新发布",
    "Đã đổi dự án; hãy phát hành lại"
  ],
  [
    "在这里对比版本、调整参数并保存。保存后，后续执行使用所选版本。",
    "So sánh phiên bản, điều chỉnh tham số và lưu tại đây. Các lượt thực thi sau sẽ dùng phiên bản đã chọn."
  ],
  [
    "正在读取版本…",
    "Đang tải phiên bản…"
  ],
  [
    "共享任务详情",
    "Chi tiết tác vụ dùng chung"
  ],
  [
    "最多支持 20 个参数",
    "Hỗ trợ tối đa 20 tham số"
  ],
  [
    "单次最多触发需求数必须为 1–10，或留空使用默认值 10",
    "Số yêu cầu tối đa mỗi lần kích hoạt phải từ 1–10 hoặc để trống để dùng mặc định 10"
  ],
  [
    "暂无安全认证信息",
    "Chưa có thông tin chứng nhận bảo mật"
  ],
  [
    "暂无质量评测",
    "Chưa có đánh giá chất lượng"
  ],
  [
    "SkillHub 暂时无法访问",
    "Tạm thời không thể truy cập SkillHub"
  ],
  [
    "换个关键词或分类试试。",
    "Hãy thử từ khóa hoặc danh mục khác."
  ],
  [
    "该版本没有 SKILL.md",
    "Phiên bản này không có SKILL.md"
  ],
  [
    "正在加载 SKILL.md…",
    "Đang tải SKILL.md…"
  ],
  [
    "TRACE 总分",
    "Tổng điểm TRACE"
  ],
  [
    "安全认证",
    "Chứng nhận bảo mật"
  ],
  [
    "收藏",
    "Yêu thích"
  ],
  [
    "该版本没有文件",
    "Phiên bản này không có tệp"
  ],
  [
    "选择左侧文件查看内容",
    "Chọn tệp bên trái để xem nội dung"
  ],
  [
    "正在加载质量评测…",
    "Đang tải đánh giá chất lượng…"
  ],
  [
    "正在加载安全认证…",
    "Đang tải chứng nhận bảo mật…"
  ],
  [
    "正在加载版本…",
    "Đang tải phiên bản…"
  ],
  [
    "暂无版本信息",
    "Chưa có thông tin phiên bản"
  ],
  [
    "作者",
    "Tác giả"
  ],
  [
    "技能标识",
    "ID kỹ năng"
  ],
  [
    "运行时目录名，全平台唯一。",
    "Tên thư mục runtime, duy nhất trên toàn nền tảng."
  ],
  [
    "更新内容",
    "Cập nhật nội dung"
  ],
  [
    "更新会整批替换文件；标识、名称、角色绑定和共享状态不变。",
    "Cập nhật sẽ thay thế toàn bộ tệp; ID, tên, liên kết vai trò và trạng thái chia sẻ không đổi."
  ],
  [
    "查看的版本",
    "Phiên bản đang xem"
  ],
  [
    "技能详情",
    "Chi tiết kỹ năng"
  ],
  [
    "只能更新本项目的技能",
    "Chỉ có thể cập nhật kỹ năng của dự án này"
  ],
  [
    "图表暂不可用",
    "Tạm thời không có biểu đồ"
  ],
  [
    "简版图表",
    "Biểu đồ đơn giản"
  ],
  [
    "图表库未加载，显示简版图表",
    "Chưa tải được thư viện biểu đồ; hiển thị biểu đồ đơn giản"
  ],
  [
    "通知 Bot",
    "Bot thông báo"
  ],
  [
    "不启用通知",
    "Không bật thông báo"
  ],
  [
    "Bot 不可访问，请重新选择",
    "Không thể truy cập bot; hãy chọn lại"
  ],
  [
    "SOP 完成后使用所选 Bot 配置的 CLI 模型单独生成整体报告，凭据沿用本次 SOP 执行身份。缺少凭据或生成失败时发送标准完成消息。",
    "Sau khi SOP hoàn tất, dùng mô hình CLI của bot đã chọn để tạo báo cáo tổng hợp riêng, với thông tin xác thực của danh tính thực thi SOP hiện tại. Nếu thiếu thông tin xác thực hoặc tạo báo cáo thất bại, gửi thông báo hoàn tất mặc định."
  ],
  [
    "自定义完成汇报（选填）",
    "Báo cáo hoàn tất tùy chỉnh (không bắt buộc)"
  ],
  [
    "AI 编写要求",
    "Yêu cầu viết cho AI"
  ],
  [
    "完成消息",
    "Thông báo hoàn tất"
  ],
  [
    "直接写想说的话，点击下面的内容即可插入。按钮会插入英文占位符，发送时自动替换为实际内容，不需要手动记忆或输入。留空则使用默认汇报。",
    "Viết nội dung muốn gửi và nhấp các mục bên dưới để chèn placeholder tiếng Anh. Hệ thống tự thay bằng nội dung thực khi gửi; không cần nhớ hay nhập thủ công. Để trống để dùng báo cáo mặc định."
  ],
  [
    "用推荐格式",
    "Dùng mẫu đề xuất"
  ],
  [
    "更多可插入内容",
    "Thêm nội dung có thể chèn"
  ],
  [
    "项目名称是当前项目，简短摘要是完成汇报的精简内容，节点执行结果会汇总各步骤的输出。",
    "Tên dự án là dự án hiện tại; tóm tắt ngắn là bản rút gọn của báo cáo hoàn tất; kết quả thực thi tổng hợp đầu ra của từng bước."
  ],
  [
    "消息内容",
    "Nội dung tin nhắn"
  ],
  [
    "接收者看到的消息示例",
    "Tin nhắn mẫu người nhận sẽ thấy"
  ],
  [
    "示例数据 · 不发送通知",
    "Dữ liệu mẫu · không gửi thông báo"
  ],
  [
    "展开后加载示例…",
    "Mở rộng để tải ví dụ…"
  ],
  [
    "以示例需求「登录校验优化」展示。实际内容会替换为本次需求和执行结果；AI 编写要求在实际执行时生效。",
    "Ví dụ dựa trên yêu cầu Tối ưu xác thực đăng nhập. Nội dung thực sẽ được thay bằng yêu cầu và kết quả thực thi hiện tại; chỉ dẫn viết cho AI có hiệu lực khi thực thi."
  ],
  [
    "独立 AI 汇总所有节点的输出、验证信息和历史产物，提炼需求的整体成果。以上设置仅影响完成汇报，失败与待人工提醒始终使用标准消息。",
    "AI riêng tổng hợp đầu ra các bước, thông tin xác minh và sản phẩm trước đó để rút ra kết quả chung của yêu cầu. Cài đặt trên chỉ ảnh hưởng báo cáo hoàn tất; cảnh báo thất bại và chờ phê duyệt luôn dùng thông báo chuẩn."
  ],
  [
    "正在获取本项目机器人…",
    "Đang tải bot của dự án…"
  ],
  [
    "选择已绑定聊天的 Bot",
    "Chọn bot đã liên kết cuộc trò chuyện"
  ],
  [
    "Bot 已删除或不可访问，请重新选择",
    "Bot đã bị xóa hoặc không thể truy cập; hãy chọn lại"
  ],
  [
    "触发条件",
    "Điều kiện kích hoạt"
  ],
  [
    "内容方式",
    "Cách tạo nội dung"
  ],
  [
    "自定义模板，可插入 AI 内容",
    "Mẫu tùy chỉnh, có thể chèn nội dung AI"
  ],
  [
    "AI 编写整段通知",
    "AI viết toàn bộ thông báo"
  ],
  [
    "简洁进展",
    "Tiến độ ngắn gọn"
  ],
  [
    "示例预览",
    "Xem trước ví dụ"
  ],
  [
    "不发送 · AI 部分为示例",
    "Không gửi · nội dung AI chỉ là ví dụ"
  ],
  [
    "正在渲染预览…",
    "Đang tạo bản xem trước…"
  ],
  [
    "＋ 添加 Bot 通知",
    "＋ Thêm thông báo qua bot"
  ],
  [
    "留空使用默认汇报。也可以点击「用推荐格式」，再修改文案。",
    "Để trống để dùng báo cáo mặc định hoặc chọn mẫu đề xuất rồi chỉnh sửa nội dung."
  ],
  [
    "正在更新示例…",
    "Đang cập nhật ví dụ…"
  ],
  [
    "在「个人凭证」中配置后，重新打开通用模板即可看到最新状态",
    "Sau khi cấu hình thông tin xác thực cá nhân, mở lại mẫu chung để xem trạng thái mới nhất"
  ],
  [
    "未选择仓库",
    "Chưa chọn kho mã"
  ],
  [
    "当前项目未配置 TAPD，无法同步",
    "Dự án chưa cấu hình TAPD nên không thể đồng bộ"
  ],
  [
    "请选择平台或 TAPD",
    "Chọn nền tảng hoặc TAPD"
  ],
  [
    "当前项目未配置 TAPD",
    "Dự án chưa cấu hình TAPD"
  ],
  [
    "已在平台建单，TAPD 同步失败：",
    "Đã tạo yêu cầu trên nền tảng; đồng bộ TAPD thất bại:"
  ],
  [
    "每个 SSH 主机配置一把个人密钥，同一主机的仓库自动共用。SSH 密钥只用于 Git 克隆和推送，不能用于创建 PR/MR；创建 PR/MR 需要访问令牌。",
    "Cấu hình một khóa cá nhân cho mỗi máy chủ SSH; các kho mã trên cùng máy chủ tự dùng chung khóa. Khóa SSH chỉ dùng để clone và push Git, không dùng để tạo PR/MR; cần token truy cập để tạo PR/MR."
  ]
])assert.equal(window.lfTranslate(source),expected,source);
});
