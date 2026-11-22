import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../../chatbot/src/QuickAccessWizard.jsx',import.meta.url),'utf8');
async function calls(lang){
 const initial=src.slice(src.indexOf('const builtinDisplay'),src.indexOf('import React'));
 const roles=src.slice(src.indexOf('const FALLBACK_ROLE_PROMPTS_VI'),src.indexOf('const BRANCH_OPTIONS = ['));
 const fn=src.slice(src.indexOf('async function provisionFallbackProjectSOP('),src.indexOf('export default function QuickAccessWizard('));
 const recorded=[],context=vm.createContext({chatT:(zh,vi)=>lang==='vi'?vi:zh,write:async(url,body,method)=>{recorded.push({url,body,method});return body}});
 await vm.runInContext("const DEFAULT_SOP_ID='generic-backend-delivery';\n"+initial+'\n'+roles+'\n'+fn+"\nprovisionFallbackProjectSOP('proj-123','sop-123','alice')",context);
 return recorded;
}
test('fresh Vietnamese fallback SOPs contain localized role prompts and preserve technical contracts',async()=>{
 const vi=await calls('vi'),zh=await calls('zh');
 const roles=vi.filter(x=>x.url==='/api/agents'),zhRoles=zh.filter(x=>x.url==='/api/agents');
 assert.equal(roles.length,7);
 for(let i=0;i<roles.length;i++){
  assert.doesNotMatch(roles[i].body.prompt+roles[i].body.name+roles[i].body.description,/[\u3400-\u9fff]/);
  assert.equal(roles[i].body.id,zhRoles[i].body.id);
  assert.deepEqual(JSON.parse(JSON.stringify(roles[i].body.artifactOutputs)),JSON.parse(JSON.stringify(zhRoles[i].body.artifactOutputs)));
  assert.match(roles[i].body.prompt,/{{input}}$/);
 }
 const workflow=vi.find(x=>x.url==='/api/workflows').body,original=zh.find(x=>x.url==='/api/workflows').body;
 assert.equal(workflow.name,'SOP bàn giao backend');
 assert.deepEqual(Array.from(workflow.nodes,n=>n.id),Array.from(original.nodes,n=>n.id));
 assert.deepEqual(JSON.parse(JSON.stringify(workflow.nodes.map(n=>n.artifactOutputs))),JSON.parse(JSON.stringify(original.nodes.map(n=>n.artifactOutputs))));
 assert.equal(workflow.tags[1],'generic-source:generic-backend-delivery');
 assert.equal(zh.find(x=>x.url==='/api/sandboxes').body.name,'本地开发沙箱');
});
