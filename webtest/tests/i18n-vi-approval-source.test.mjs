import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/app/approvals.js',import.meta.url),'utf8');
const part=(a,b)=>source.slice(source.indexOf('function '+a+'('),source.indexOf('function '+b+'('));
function reason(lang,run,id){
  const ctx=vm.createContext({window:{lfLang:()=>lang},run,id});
  vm.runInContext(part('approvalVI','waitingNodeId')+'\n'+part('approvalWaitReason','humanGateSectionsHTML'),ctx);
  return vm.runInContext('approvalWaitReason(run,id)',ctx);
}
test('Vietnamese manual gate reason preserves workflow, node names and user instructions',()=>{
 const run={workflowSnapshot:{name:'项目 <SOP>',nodes:[{id:'a',name:'Build <unsafe>'},{id:'b',type:'approval',rejectTo:'a',taskPrompt:'保留原文 <测试>'},{id:'c',name:'Delivery'}],edges:[{source:'a',target:'b'},{source:'b',target:'c'}]}};
 const text=reason('vi',run,'b');
 for(const value of ['có bước phê duyệt thủ công','项目 <SOP>','Build <unsafe>','Delivery','保留原文 <测试>'])assert.ok(text.includes(value),value);
 assert.match(reason('zh',run,'b'),/人工门禁/);
 assert.equal(reason('en',run,'b'),reason('zh',run,'b'));
 assert.match(reason('vi',{workflowSnapshot:{nodes:[{id:'b',type:'approval'}]}},'b'),/lượt chạy kết thúc/);
});
