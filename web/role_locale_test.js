// User-reported untranslated role editor labels and placeholders.
// Run: node role_locale_test.js i18n-en.js i18n-vi.js app/flows.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const [enFile, viFile, flowsFile] = process.argv.slice(2);
const context = vm.createContext({window:{}});
for (const file of [enFile,viFile]) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const en=context.window.LF_I18N_EN,vi=context.window.LF_I18N_VI;
const expected = {
 '读 {{feedback}}，只修失败项，不要重做已经通过的部分':'Đọc {{feedback}}, chỉ sửa các mục thất bại; không làm lại phần đã đạt.',
 'Run工作区（校验产物等场景）':'Workspace của lượt chạy (chẳng hạn kiểm tra sản phẩm đầu ra)',
 'Agent 写完结论，人批准再往下走':'Agent hoàn tất kết luận, người phụ trách phê duyệt trước khi tiếp tục.',
 'Hook 名称':'Tên hook',
 '⛶ 打开代码编辑器编写命令':'⛶ Mở trình soạn thảo mã để viết lệnh',
 '⛶ 打开代码编辑器编写脚本':'⛶ Mở trình soạn thảo mã để viết script',
 '+ 添加要交的文件':'+ Thêm tệp bàn giao',
 'Agent 完成任务后必须先调用 submit_gate_result 提交终态；缺失时自动恢复同一会话重试。':'Sau khi hoàn thành, Agent phải gọi submit_gate_result để gửi trạng thái cuối; nếu thiếu, hệ thống sẽ tiếp tục phiên làm việc hiện tại để thử lại.',
 '+ 添加 Hook':'+ Thêm hook',
};
const src=fs.readFileSync(flowsFile,'utf8');
for(const [original,translated] of Object.entries(expected)){
  assert.ok(src.includes(original),'Missing source label: '+original);
  assert.equal(vi[original],translated,'Missing Vietnamese for: '+original);
  assert.ok(typeof en[original]==='string'&&en[original].trim(),'Missing English for: '+original);
}
assert.ok(vi['读 {{feedback}}，只修失败项，不要重做已经通过的部分'].includes('{{feedback}}'));
console.log('role locale i18n mappings ok');