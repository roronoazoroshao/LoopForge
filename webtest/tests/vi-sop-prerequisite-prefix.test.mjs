import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=n=>readFileSync(new URL('../../web/'+n,import.meta.url),'utf8');
test('SOP requirement prefixes are Vietnamese without changing raw requirement names',()=>{
 const src=file('app/sops.js'),impl=src.slice(src.indexOf('function sopRunRequirementChips(w){'),src.indexOf('// --- 流程模板卡片'));
 const run=lang=>{const ctx=vm.createContext({window:{lfLang:()=>lang},sopRunRequirements:()=>[{label:'SSH Key',ok:false,hint:'raw'}],sopBadge:label=>label});vm.runInContext(impl,ctx);return vm.runInContext('sopRunRequirementChips({})',ctx)};
 assert.match(run('vi'),/Cần: SSH Key/);
 assert.match(run('zh'),/需要 SSH Key/);
});
test('repository drawer missing-copy errors have Vietnamese catalogue entries',()=>{
 const w={},ctx=vm.createContext({window:w});vm.runInContext(file('i18n-vi.js'),ctx);
 assert.equal(w.LF_I18N_VI['仓库不存在或已被删除'],'Không tìm thấy kho mã hoặc kho mã đã bị xóa');
 assert.equal(w.LF_I18N_VI['编辑代码仓库'],'Chỉnh sửa kho mã');
});
