import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const path=n=>new URL('../../chatbot/src/'+n,import.meta.url);
const read=n=>readFileSync(path(n),'utf8');
test('personal conversation group title is translated but attached project names are not',()=>{
 const src=read('session-history.js').replace('import { chatT } from "./locale.js";','').replace(/\bexport (?=(?:function|const) )/g,'');
 const name=lang=>{const c=vm.createContext({chatT:(zh,vi)=>lang==='vi'?vi:zh});vm.runInContext(src,c);return [vm.runInContext("sessionProjectName('',[])",c),vm.runInContext("sessionProjectName('p1',[{id:'p1',name:'项目 A'}])",c)]};
 assert.deepEqual(name('vi'),['Hội thoại cá nhân','项目 A']);
 assert.deepEqual(name('zh'),['个人对话','项目 A']);
});
test('completed artifact source displays Vietnamese without changing the underlying marker',()=>{
 const src=read('locale.js').replace(/\bexport (?=(?:function|const) )/g,'');
 const label=lang=>{const c=vm.createContext({localStorage:{getItem:()=>lang}});vm.runInContext(src,c);return vm.runInContext("artifactSourceLabel('已完成')",c)};
 assert.equal(label('vi'),'Đã hoàn thành');
 assert.equal(label('zh'),'已完成');
});
