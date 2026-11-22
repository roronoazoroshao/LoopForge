import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('../../web/app/projects.js',import.meta.url),'utf8');
const part=s.slice(s.indexOf('async function confirmDiscardProjectDraft()'),s.indexOf('function openProjectAdminDetail('))+'\n'+s.slice(s.indexOf('async function deleteProjectRepository('),s.indexOf('function bindProjectAdmin('));
async function dialogs(lang){
 const requests=[],scope={state:{projectDraft:{name:'项目 của tôi'},data:{projects:[{id:'p1',defaultRepositoryId:'r1'}],repositories:[{id:'r1',name:'仓库 của tôi',projectId:'p1'}]}},window:{lfLang:()=>lang},projectAdminDirty:()=>true,afConfirm:async x=>{requests.push(x);return false}};
 await vm.runInContext('(async()=>{'+part+'\nawait confirmDiscardProjectDraft();await deleteProjectRepository("r1")})()',vm.createContext(scope));
 return requests;
}
test('Vietnamese destructive dialogs protect raw names and explain default repository handling',async()=>{
 const vi=await dialogs('vi');
 assert.equal(vi.length,2);assert.ok(vi.every(x=>x.messageLocalized===true));
 assert.match(vi[0].message,/项目 của tôi/);assert.match(vi[1].message,/仓库 của tôi/);assert.match(vi[1].message,/Chưa liên kết/);
 const zh=await dialogs('zh');
 assert.equal(zh[1].messageLocalized,false);assert.match(zh[1].message,/确定删除仓库/);
});
