import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=name=>fs.readFileSync(new URL('../../web/app/'+name,import.meta.url),'utf8');
test('markdown-skipped notification preview localizes its loading status',()=>{
 assert.match(source('notification-editor.js'),/output\.textContent=notificationCopy\('正在更新示例…','Đang cập nhật bản xem trước…'\)/);
});
test('approval counters and human-gate names localize at the source',()=>{
 const s=source('approvals.js');
 const helper=s.slice(s.indexOf('function approvalVI('),s.indexOf('function waitingNodeId('));
 const label=s.slice(s.indexOf('function approvalBatchSelectedLabel('),s.indexOf('function approvalBatchBarHTML('));
 const reason=s.slice(s.indexOf('function approvalWaitReason('),s.indexOf('function humanGateSectionsHTML('));
 const run={workflowSnapshot:{name:'Tên 小熊',nodes:[{id:'a',name:'Bước 原 bản'},{id:'b',type:'approval'}],edges:[{source:'a',target:'b'}]}};
 for(const [lang,count,upstream] of [['vi','Đã chọn 3 mục','“Bước 原 bản”'],['zh','已选 3 条','「Bước 原 bản」']]){
  const c=vm.createContext({window:{lfLang:()=>lang},run});
  vm.runInContext(helper+label+reason,c);
  assert.equal(vm.runInContext('approvalBatchSelectedLabel(3)',c),count);
  assert.ok(vm.runInContext("approvalWaitReason(run,'b')",c).includes(upstream));
 }
});