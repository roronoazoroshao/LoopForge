import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=n=>readFileSync(new URL('../../web/'+n,import.meta.url),'utf8');
function translate(lang){const win={confirm(){},alert(){},prompt(){}},doc={documentElement:{dataset:{lang},classList:{contains:()=>false}},readyState:'loading',addEventListener(){}};vm.runInContext(file('i18n-en.js')+'\n'+file('i18n-vi.js')+'\n'+file('i18n.js'),vm.createContext({window:win,document:doc,MutationObserver:class{}}));return win.lfTranslate||((x)=>x)}
test('backend SOP errors are displayed in Vietnamese only, preserving identifiers',()=>{
 assert.equal(translate('vi')('SOP sop-ab_23 不存在'),'Không tìm thấy SOP sop-ab_23');
 assert.equal(translate('vi')('SOP sop-4.2 不属于当前项目'),'SOP sop-4.2 không thuộc dự án hiện tại');
 assert.equal(translate('vi')('步骤责任人必须是有效用户'),'Người phụ trách bước phải là người dùng hợp lệ');
 assert.equal(translate('vi')('同步到工蜂 Issue 需要先绑定代码仓库'),'Hãy liên kết kho mã trước khi đồng bộ yêu cầu sang Gongfeng');
 assert.notEqual(translate('en')('SOP sop-ab_23 不存在'),'Không tìm thấy SOP sop-ab_23');
 assert.equal(translate('zh')('SOP sop-ab_23 不存在'),'SOP sop-ab_23 不存在');
});
