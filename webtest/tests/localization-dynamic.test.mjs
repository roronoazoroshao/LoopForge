import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Exercise the actual production functions in a VM with explicit UI/API boundary stubs.
// This test is deliberately dependency-free; browser integration is covered separately.
const readSource=p=>fs.readFileSync(new URL(`../../web/${p}`,import.meta.url),'utf8');
function segment(source,start,end){
  const a=source.indexOf(start);assert.notEqual(a,-1,`Missing source start: ${start}`);
  const b=end?source.indexOf(end,a+start.length):-1;
  return source.slice(a,b===-1?source.length:b);
}
function read(p){
  const source=readSource(p);
  if(p==='app.js')return segment(source,'function catalogGeneric(item){','function sopSeedRoleDisplayName(');
  if(p==='app/flows.js')return segment(source,'function completeFlowConnect(target){','// Sets the single reject route');
  if(p==='app/issues.js')return segment(source,'function fillImportTAPDWorkflow(){','function fillImportTAPDRepository(){')+segment(source,'function openIssue(issue=null){','function issueFromForm(){');
  if(p==='app/approvals.js')return segment(source,'async function rejectRun(','function approvalStatusBadgeHTML(');
  if(p==='app/flow-palette.js')return segment(source,'  function render(){','  function payload(');
  throw Error(`Unexpected module ${p}`);
}
const copy=(v)=>JSON.parse(JSON.stringify(v));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const template={id:'copy',name:'后端交付 SOP',projectId:'p',tags:['generic-source:generic-backend-delivery'],nodes:[{id:'clarify',name:'需求定型',type:'agent'},{id:'design',name:'方案设计',type:'agent'},{id:'custom',name:'成功 <&',type:'agent'}],edges:[]};
const locales=[['zh','需求定型','方案设计','后端交付 SOP'],['en','Requirement scoping','Solution design','Backend delivery SOP'],['vi','Chốt yêu cầu','Thiết kế giải pháp','SOP bàn giao backend']];
function setup(locale){const window={lfT:(zh,en,vi)=>({zh,en,vi})[locale],lfLang:()=>locale};const c=vm.createContext({window,lfT:window.lfT,escapeHTML,state:{workflow:copy(template),projectFilter:'p'},console});vm.runInContext(read('app.js'),c);return c;}
for(const [lang,clarify,design,wfName] of locales){
  test(`${lang}: success and rejection messages localize seed names without changing data`,()=>{
    const c=setup(lang),messages=[];Object.assign(c,{renderCanvas(){},renderProperties(){},toast(){},flowConnectCheck:()=>({ok:true}),flowReaches:()=>false,flowHistory:{record(){}},uid:()=> 'e1',dirty(){},flowToast:(...args)=>messages.push(args),setRejectTo:(id,target)=>{c.state.workflow.nodes.find(n=>n.id===id).rejectTo=target;return true}});
    vm.runInContext(read('app/flows.js'),c);
    assert.equal(c.connect('clarify','custom'),true);
    const expected={zh:`已连接「${clarify}」→「成功 <&」`,en:`Connected “${clarify}” → “成功 <&”`,vi:`Đã kết nối “${clarify}” → “成功 <&”`}[lang];
    assert.equal(messages[0][0],expected);assert.equal(messages[0][1].localized,true);assert.equal(messages[0][1].undo,true);
    assert.deepEqual(copy(c.state.workflow.edges),[{id:'e1',source:'clarify',target:'custom',when:'success'}]);
    c.state.connectFrom='clarify';c.state.connectOutlet='reject';assert.equal(c.completeFlowConnect(c.state.workflow.nodes[1]),true);
    assert.equal(messages[1][0],{zh:`「${clarify}」失败时打回到「${design}」`,en:`Send “${clarify}” back to “${design}” on failure`,vi:`Trả “${clarify}” về “${design}” khi thất bại`}[lang]);
    c.state.connectFrom='clarify';c.state.connectOutlet='reject';assert.equal(c.completeFlowConnect(c.state.workflow.nodes[2]),true);
    assert.equal(messages[2][0],{zh:`「${clarify}」的打回目标已从「${design}」改为「成功 <&」`,en:`Changed the rework target of “${clarify}” from “${design}” to “成功 <&”`,vi:`Đã đổi bước làm lại của “${clarify}” từ “${design}” sang “成功 <&”`}[lang]);
    assert.deepEqual(c.state.workflow.nodes.map(n=>n.name),template.nodes.map(n=>n.name));assert.equal(c.state.workflow.nodes[0].rejectTo,'custom');
  });
  test(`${lang}: TAPD options use seed display names, preserve custom names, escape and keep selection`,()=>{
    const c=setup(lang),select={};const custom={...template,id:'custom',tags:[],name:'后端交付 SOP'},special={id:'special',name:'<script> & 中文'};const opts=[template,custom,special];Object.assign(c,{$:()=>select,runnableWorkflowOptions:()=>opts,defaultSOPForIssue:()=>template.id});vm.runInContext(read('app/issues.js'),c);c.fillImportTAPDWorkflow();
    assert.match(select.innerHTML,new RegExp(`value="copy" selected[^>]*>${wfName}</option>`));assert.match(select.innerHTML,/value="custom"[^>]*>后端交付 SOP<\/option>/);assert.match(select.innerHTML,/&lt;script&gt; &amp; 中文/);assert.equal((select.innerHTML.match(/data-i18n-skip/g)||[]).length,3);assert.equal(template.name,'后端交付 SOP');
  });
  test(`${lang}: approval rejection prompt and toast preserve custom target and request body`,async()=>{
    const c=setup(lang);let prompt,request,toast;Object.assign(c,{queuedRunActionBlocked:()=>false,approvalVI:()=>lang==='vi',approvalCopy:(zh,vi)=>lang==='vi'?vi:zh,afPrompt:async p=>(prompt=p,'用户原因 <&'),api:async (url,opts)=>{request={url,body:JSON.parse(opts.body)}},withHumanContext:x=>x,readHumanContext:()=>({note:'原文'}),toast:(...args)=>{toast=args},renderApprovals(){}});vm.runInContext(read('app/approvals.js'),c);await c.rejectRun('run','node',{dataset:{target:'custom',targetName:'成功 <&'}});
    assert.equal(prompt.title,{zh:'退回上游「成功 <&」重做',en:'Send back to “成功 <&” for rework',vi:'Trả về bước “成功 <&” để làm lại'}[lang]);assert.equal(prompt.messageLocalized,true);assert.equal(prompt.titleLocalized,true);
    assert.equal(prompt.defaultValue,{zh:'验证未通过，请上游修复后重新提交',en:'Verification failed. Fix the issue in the upstream step and resubmit.',vi:'Xác minh chưa đạt; vui lòng sửa ở bước trước rồi gửi lại'}[lang]);
    assert.equal(toast[0],{zh:'已退回「成功 <&」，开始重跑后续流程',en:'Sent back to “成功 <&”; rerunning downstream steps',vi:'Đã trả về bước “成功 <&”, bắt đầu chạy lại các bước sau'}[lang]);assert.equal(toast[3],true);
    assert.deepEqual(request,{url:'/api/runs/run/reject',body:{nodeId:'node',targetId:'custom',reason:'用户原因 <&',context:{note:'原文'}}});
  });
  test(`${lang}: palette empty search text preserves user query`,()=>{
    const c=setup(lang);const empty={setAttribute(k){this[k]=true},removeAttribute(k){delete this[k]}};const els={flowPaletteRoles:{},flowPaletteQ:{value:'成功 <&'},flowPaletteEmpty:empty};Object.assign(c,{document:{getElementById:id=>els[id],querySelectorAll:()=>[]},workflowAgents:()=>[],paletteVI:()=>lang==='vi',paletteCopy:(zh,vi)=>lang==='vi'?vi:zh});vm.runInContext(read('app/flow-palette.js'),c);c.render();assert.equal(empty.textContent,{zh:'没有匹配「成功 <&」的节点',en:'No steps match “成功 <&”',vi:'Không tìm thấy bước phù hợp với “成功 <&”'}[lang]);assert.equal(empty['data-i18n-skip'],true);assert.equal(empty.hidden,false);
  });
}
for(const [lang,,,wfName] of locales){
  test(`${lang}: new issue selector uses display-only names and keeps default ID`,()=>{
    const c=setup(lang),elements=Object.fromEntries(['id','projectId','title','description','priority','status','workflowId','baseBranch','tapdId','automationIgnored'].map(k=>[k,{value:'',dataset:{}}]));
    const els={'#issueForm':{elements},'#issueRepoChecks':{},'#issueModalTitle':{},'#issueTaskState':{},'#issueModal':{classList:{add(){}}}};
    c.state.data={projects:[{id:'p',name:'用户项目'}],tasks:[]};const custom={...template,id:'custom',tags:[]};Object.assign(c,{$:id=>els[id],document:{querySelector:()=>null},runnableWorkflowOptions:()=>[template,custom],defaultSOPForIssue:()=>template.id,storedIssueWorkBranch:()=>'',fillIssueRepositories(){},fillIssueAssignees(){},renderIssueRepositoryBranchInputs(){},selectedIssueRepositoryIds:()=>[],refreshIssueBaseBranchInput(){}});
    vm.runInContext(read('app/issues.js'),c);c.openIssue();
    assert.match(elements.workflowId.innerHTML,new RegExp(`value="copy" data-i18n-skip>${wfName}</option>`));assert.match(elements.workflowId.innerHTML,/value="custom" data-i18n-skip>后端交付 SOP<\/option>/);assert.equal(elements.workflowId.value,'copy');assert.equal(elements.projectId.value,'p');assert.equal(template.name,'后端交付 SOP');
  });
}
