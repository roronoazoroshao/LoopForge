import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/app/agents.js',import.meta.url),'utf8');
const fragment=source.slice(0,source.indexOf('function renderAgentsLegacy(){'))+source.slice(source.indexOf('function agentRowTag('),source.indexOf('function openAgentRowMenu('));
function fixture(locale){
 const context=vm.createContext({window:{lfLang:()=>locale},state:{data:{projects:[{id:'p',name:'项目测试'}]},agentUsage:new Map([['used',2]])},catalogOwned:()=>false,escapeHTML:x=>x});
 vm.runInContext(fragment,context);return context;
}
test('Agent catalogue localization preserves user role/project names and counter values',()=>{
 const vi=fixture('vi');
 assert.match(vm.runInContext("agentRowTag({projectId:'p'})",vi),/Từ dự án 项目测试/);
 assert.match(vm.runInContext("agentRowTag({projectId:'p'})",vi),/data-i18n-skip/);
 assert.match(vm.runInContext("agentConfigSummary({loop:{enabled:true,maxIterations:3},skills:[1,2]})",vi),/3 lượt lặp/);
 assert.match(vm.runInContext("agentConfigSummary({skills:[1,2]})",vi),/2 kỹ năng/);
 assert.match(vm.runInContext("agentDeleteBlockReason({id:'used'})",vi),/đang được quy trình tham chiếu/);
 const zh=fixture('zh');
 assert.match(vm.runInContext("agentConfigSummary({skills:[1,2]})",zh),/2 技能/);
});
test('Agent deletion source protects dynamic names and does not change DELETE API path',()=>{
 assert.match(source,/messageLocalized:agentVI\(\)/);
 assert.match(source,/Xóa vai trò “\$\{a.name\}”/);
 assert.match(source,/\/api\/agents\/\$\{encodeURIComponent\(id\)\}/);
});
