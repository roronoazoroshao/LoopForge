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
