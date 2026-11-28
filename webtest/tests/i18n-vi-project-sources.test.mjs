import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function wizardCases(load, assert){
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const name='项目 <img src=x> "Demo"',id='fixture-id';
  function fixture(locale){
    const window={lfLang:()=>locale,addEventListener(){}},document={addEventListener(){}};
    const state={data:{projects:[{id,name,key:'FIX',ownerId:1,members:[{userId:2}],workflowId:'wf',defaultRepositoryId:'r'}],repositories:[]},currentUser:{id:1},projectFilter:''};
    const w={step:'basic',done:{},skipped:{},saving:false,draft:{name,color:'#fff'},repo:{url:'',branch:'main',integrate:''}};
    const wizard=new Function('window','document','state','escapeHTML','tapdIntegrationAvailable','projectWorkflowName',load('web/app/project-wizard.js')+'\nreturn {rail:projectWizardRailHTML,footer:projectWizardFooterHTML,summary:projectWizardSummary,repoHint:projectWizardRepoHint};')(window,document,state,esc,()=>true,()=> 'SOP fixture');
    let confirmed=false,dialog,notice,requests=[];
    const source=load('web/app/projects.js');
    const body=source.slice(source.indexOf('async function deleteProjectAdmin('),source.indexOf('async function deleteProjectRepository('));
    const del=new Function('window','state','afConfirm','api','resetProjectAdminDetail','history','projectAdminHash','renderAll','renderProjectAdmin','toast','invalidateProjectJoinMembers',body+'\nreturn deleteProjectAdmin;')(window,state,async opt=>{dialog=opt;return confirmed},async(...args)=>{requests.push(args)},()=>{}, {replaceState(){}},()=>'',()=>{},()=>{},(...args)=>{notice=args},()=>{});
    return {wizard,w,state,del,confirm:()=>{confirmed=true},get dialog(){return dialog},get notice(){return notice},requests};
  }
  return [
    ['Vietnamese wizard step and footer templates',async()=>{const f=fixture('vi');assert(f.wizard.rail(f.w).includes('Tên và LOOP mặc định'),'rail desc');assert(f.wizard.rail(f.w).includes('Liên kết kho mã Git'),'repo desc');assert(f.wizard.rail(f.w).includes('Tích hợp TAPD'),'TAPD');assert(f.wizard.footer(f.w).includes('Tạo và tiếp tục'),'create');f.w.saving=true;assert(f.wizard.footer(f.w).includes('Đang lưu…'),'loading');f.w.saving=false;f.w.step='members';assert(f.wizard.footer(f.w).includes('Quay lại'),'back');}],
    ['Vietnamese summary preserves names and localizes quantities',async()=>{const f=fixture('vi'),p=f.state.data.projects[0];const entries=f.wizard.summary(p,[{id:'r',name}]);assert(entries[0].value.includes(esc(name)), 'escaped name');assert(entries[0].value.includes('data-i18n-skip'),'protected name');assert(entries[2].value.includes('1 kho mã'),'repo quantity');assert(entries[3].value.includes('2 người'),'member quantity');}],
    ['Vietnamese soft-delete confirm and toast preserve user content',async()=>{const f=fixture('vi');await f.del(id);assert(f.requests.length===0,'cancel must not delete');assert(f.dialog.message.includes(name),'name');assert(f.dialog.message.includes('có thể khôi phục'),'recoverable');assert(f.dialog.message.includes(id),'ID');assert(f.dialog.messageLocalized===true,'protected dialog');f.confirm();await f.del(id);assert(f.requests.length===1&&f.requests[0][0]==='/api/projects/'+id&&f.requests[0][1].method==='DELETE','API contract');assert(f.notice[0]==='Đã xóa dự án “'+name+'”'&&f.notice[3]===true,'protected toast');}],
    ['Chinese and English source paths remain unchanged',async()=>{for(const lang of ['zh','en']){const f=fixture(lang);assert(f.wizard.rail(f.w).includes('名称与默认 LOOP'),'non-VI rail');assert(f.wizard.footer(f.w).includes('创建并继续'),'non-VI footer');await f.del(id);assert(f.dialog.message.startsWith('确定删除项目'),'non-VI dialog');assert(!f.dialog.messageLocalized,'non-VI observer');}}]
  ];
}

for (const [name, run] of wizardCases(path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8'), assert.ok)) test(name, run);
