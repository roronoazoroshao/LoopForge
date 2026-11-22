import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=n=>readFileSync(new URL('../../chatbot/src/'+n,import.meta.url),'utf8');
function evaluate(name,lang){const src=file(name).replace(/^import .*;\s*$/gm,'').replace(/\bexport (?=(?:function|const) )/g,'');const context=vm.createContext({chatT:(zh,vi)=>lang==='vi'?vi:zh,chatLocale:()=>lang});vm.runInContext(src,context);return context;}
test('Git change status names are Vietnamese only while paths and status codes remain raw',()=>{
 const vi=evaluate('changes.js','vi'),zh=evaluate('changes.js','zh');
 const row=vm.runInContext("mergeChanges([{path:'src/原样 文件.js',index:'M',worktree:' '}],[])[0]",vi);
 assert.equal(row.label,'Đã sửa');assert.equal(row.status,'M');assert.equal(row.path,'src/原样 文件.js');
 assert.equal(vm.runInContext("statusLabel('U')",vi),'Xung đột');
 assert.equal(vm.runInContext("statusLabel('M')",zh),'修改');
});
test('missing tool-completion start record uses localized fallback and preserves failure state',()=>{
 for(const [lang,label] of [['vi','Lời gọi công cụ thất bại'],['zh','工具调用失败']]){
  const ctx=evaluate('activity.js',lang);
  const step=vm.runInContext("mergeActivity([],[{data:{kind:'toolDone',id:'missing',failed:true},sequence:1}])[0]",ctx);
  assert.equal(step.text,label);assert.equal(step.failed,true);assert.equal(step.kind,'tool');assert.equal(step.id,'missing');
 }
});
