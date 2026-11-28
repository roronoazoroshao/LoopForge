import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const agents=read('web/app/agents.js');
const flows=read('web/app/flows.js');
const assets=read('web/app/assets.js');
const migration=read('migrations/023_role_prompt.sql');
const seed=read('migrations/seed/001_public_catalog.sql');
const pick=(source,start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'missing production source boundary '+start);
  return source.slice(a,b);
};
const locale=lang=>({
  lfLang:()=>lang,
  lfT:(zh,en,vi)=>lang==='vi'?vi:lang==='en'?en:zh
});
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const seedRole={
  id:'baseline-align-resolver',projectId:'',name:'基线对齐执行员',version:1,
  prompt:'只做基线对齐：fetch 默认分支并 merge 到当前工作分支；解决冲突时保留双方有效实现，拿不准时记录取舍。创建本地合并提交。不要自行 push 或修改默认分支，不要执行与本次基线对齐无关的测试或编写修复报告。'
};

function assetName(lang,item,type='rules'){
  const ctx={window:locale(lang),state:{assetType:type},item,result:'',
    assetVI:()=>lang==='vi'};
  runInNewContext(pick(assets,'const ASSET_SEED_NAMES=','function assetIsBuiltin(')+
    '\nresult=assetDisplayName(item,"'+type+'");',ctx);
  return ctx.result;
}

test('public engineering rule name is a presentation-only exact seed match',()=>{
  assert.match(seed,/'public-engineering','工程与验证约束'/);
  const src={id:'public-engineering',name:'工程与验证约束',content:'原始约束'};
  assert.equal(assetName('vi',src),'Quy tắc kỹ thuật và xác minh');
  assert.equal(assetName('zh',src),'工程与验证约束');
  assert.equal(assetName('vi',{...src,name:'Quy tắc riêng 中文'}),'Quy tắc riêng 中文');
  assert.equal(assetName('vi',{...src,id:'another-id'}),'工程与验证约束');
  assert.equal(src.name,'工程与验证约束');
  assert.equal(src.content,'原始约束');
});

function editModal(lang,agent){
  const form={elements:{
    id:{value:''},name:{value:''},description:{value:''},shared:{checked:false}
  }};
  const title={textContent:'',setAttribute(){},removeAttribute(){}};
  const el={'#agentForm':form,'#agentVersion':{textContent:''},
    '#agentIdShow':{value:''},'#agentWizardTitle':title};
  const ctx={form,title,agent,result:null,window:locale(lang),
    state:{data:{assistantDefaults:{}},agentModalMode:'edit',currentUser:null},
    $:id=>el[id],storedAgentExecutorId:()=>'',loadExecutorModelCatalogs:()=>({then:()=>{}}),
    applyAgentModelUI(){},currentAgentExecutorId:()=>'',renderAgentPresets(){},
    renderAgentTaskBook(){},renderAgentGovernance(){},renderAgentAssetsPanel(){},
    renderAgentSummary(){},agentWizardForeign:()=>false,syncAgentOwnershipUI(){},renderAgents(){}};
  const code=pick(agents,'function agentVI(){','function renderAgentsLegacy(){')+
    pick(agents,'function selectAgent(a,rerender=true){','function syncAgentOwnershipUI(a){');
  runInNewContext('let agentModelRevision=0;'+code+
    '\nselectAgent(agent,false);result={title:title.textContent,name:form.elements.name.value,saveName:agentNameForSave(form,false),original:state.agentSeedNameOriginal};',ctx);
  return {result:ctx.result,form,ctx};
}

test('role wizard localizes heading and name without writing a rename',()=>{
  assert.ok(migration.includes('"id": "baseline-align-resolver"'));
  const vi=editModal('vi',{...seedRole});
  assert.equal(vi.result.title,'Sửa vai trò “Tác tử đồng bộ baseline”');
  assert.equal(vi.result.name,'Tác tử đồng bộ baseline');
  assert.equal(vi.result.saveName,seedRole.name);
  assert.equal(vi.result.original,seedRole.name);
  const zh=editModal('zh',{...seedRole});
  assert.equal(zh.result.name,seedRole.name);
  assert.match(zh.result.title,/基线对齐执行员/);
});

test('an explicit rename is saved, while custom and edited role names remain unmodified',()=>{
  const vi=editModal('vi',{...seedRole});
  vi.form.elements.name.value='Tên mới của quản trị viên';
  vi.ctx.state.agentSeedNameEdited=true;
  runInNewContext(pick(agents,'function agentVI(){','function renderAgentsLegacy(){')+
    '\nresult=agentNameForSave(form,false);',vi.ctx);
  assert.equal(vi.ctx.result,'Tên mới của quản trị viên');
  for(const a of [
    {...seedRole,id:'my-role'},
    {...seedRole,name:'Vai trò 中文 của quản trị viên'},
    {...seedRole,projectId:'p1'}
  ])assert.equal(editModal('vi',a).result.name,a.name);
});

function renderTask(lang,role){
  const textarea={value:'',oninput:null};
  const note={textContent:''};
  const host={innerHTML:'',querySelector:sel=>sel==='#agentPromptSeedNote'?note:textarea,
    querySelectorAll:()=>[]};
  const ctx={window:locale(lang),state:{},role,host,result:null,
    $:()=>host,ensureAgentDraft:()=>role,renderAgentSummary(){},dirty(){},
    agentVI:()=>lang==='vi',escapeHTML,AGENT_PROMPT_PLACEHOLDERS:[]};
  runInNewContext(pick(flows,'const AGENT_BASELINE_PROMPT_ZH=','function renderAgentGovernance(a){')+
    '\nrenderAgentTaskBook(role);result={html:host.innerHTML,draft:role.prompt};',ctx);
  return {html:ctx.result.html,host,textarea,ctx};
}

test('only the unchanged platform prompt is localized in the editor and not rewritten on render',()=>{
  assert.ok(migration.includes(seedRole.prompt),'fixture must match the source migration');
  const raw={...seedRole};
  const vi=renderTask('vi',raw);
  assert.match(vi.html,/Chỉ thực hiện đồng bộ baseline/);
  assert.match(vi.html,/Lưu vẫn giữ nguyên prompt gốc/);
  assert.equal(raw.prompt,seedRole.prompt);
  assert.match(renderTask('zh',{...seedRole}).html,/只做基线对齐/);
  assert.match(renderTask('vi',{...seedRole,prompt:seedRole.prompt+' 管理员修改'}).html,/管理员修改/);
  assert.match(renderTask('vi',{...seedRole,id:'other'}).html,/只做基线对齐/);
});

test('editing the Vietnamese prompt is an explicit data edit; untouched draft stays original',()=>{
  const role={...seedRole};
  const ui=renderTask('vi',role);
  assert.equal(role.prompt,seedRole.prompt);
  ui.textarea.value='Prompt mới do quản trị viên nhập';
  ui.textarea.oninput();
  assert.equal(role.prompt,'Prompt mới do quản trị viên nhập');
  assert.match(ui.host.querySelector('#agentPromptSeedNote').textContent,/Prompt đã được chỉnh sửa/);
});

function assetsPanel(lang,rules){
  const host={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
  const state={projectFilter:'p1',workflow:{},data:{
    rules,skills:[],mcpServers:[]
  }};
  const ctx={state,window:locale(lang),host,result:'',
    $:()=>host,ensureAgentDraft:a=>a,catalogGeneric:()=>false,
    catalogVisible:()=>true,visibleAssets:items=>items,visibleMCPAssets:items=>items,
    renderAgentHookEditors(){},escapeHTML,agentCopy:(zh,vi)=>lang==='vi'?vi:zh,
    genericMCPChecked:()=>false,assetVI:()=>lang==='vi'};
  runInNewContext(pick(assets,'const ASSET_SEED_NAMES=','function assetIsBuiltin(')+
    pick(flows,'function renderAgentAssetsPanel(a){','function renderAgentHookEditors(d){')+
    "\nrenderAgentAssetsPanel({id:'baseline-align-resolver',rules:['public-engineering'],skills:[],mcpServers:[],hooks:[]});result=host.innerHTML;",ctx);
  return ctx.result;
}

test('rule checkbox UI is Vietnamese but IDs, custom labels and content are protected',()=>{
  const items=[
    {id:'public-engineering',name:'工程与验证约束',description:'Dữ liệu gốc',shared:true},
    {id:'my-rule',name:'工程与验证约束',description:'Mô tả riêng 中文',shared:true}
  ];
  const vi=assetsPanel('vi',items);
  assert.match(vi,/name="rules" value="public-engineering" checked/);
  assert.match(vi,/<b data-i18n-skip>Quy tắc kỹ thuật và xác minh<\/b>/);
  assert.match(vi,/<b data-i18n-skip>工程与验证约束<\/b>/);
  assert.match(vi,/data-i18n-skip>Mô tả riêng 中文/);
  assert.match(assetsPanel('zh',items),/<b data-i18n-skip>工程与验证约束<\/b>/);
  assert.equal(items[0].name,'工程与验证约束');
});

test('effort choice labels translate canonical levels but keep the stable ID and unknown provider labels',()=>{
  const script=pick(agents,'function agentVI(){','function renderAgentsLegacy(){')+
    pick(agents,'function agentEffortItems(executorId){','function paintAgentPicker(');
  const get=lang=>{
    const ctx={window:locale(lang),result:null,AGENT_CUSTOM_MODEL:'__custom__',
      executorModelCatalogs:()=>({codex:{efforts:[
        {value:'low',label:'低 low'}, {value:'medium',label:'中 medium'},
        {value:'high',label:'高 high'}, {value:'xhigh',label:'超高 xhigh'},
        {value:'max',label:'最大 max'},{value:'partner',label:'服务商中文'}
      ]}}),$:sel=>sel.includes('modelChoice')?{value:'model'}:null};
    runInNewContext(script+"\nresult=agentEffortItems('codex');",ctx);
    return [...ctx.result];
  };
  const vi=get('vi');
  assert.deepEqual(vi.map(x=>x.id),['','low','medium','high','xhigh','max','partner']);
  assert.deepEqual(vi.slice(0,6).map(x=>x.name),[
    'Mặc định','Thấp (low)','Trung bình (medium)','Cao (high)','Rất cao (xhigh)','Tối đa (max)'
  ]);
  assert.equal(vi.at(-1).name,'服务商中文');
  assert.equal(get('zh')[4].name,'超高 xhigh');
});

test('runtime summary uses Vietnamese units, including nonzero counts',()=>{
  const source=pick(flows,'function renderAgentSummary(){','function renderAgentPreview(a){');
  const note={textContent:''},form={elements:{loopEnabled:{checked:true},
    loopMaxIterations:{value:3}},querySelectorAll:()=>[]};
  const ctx={window:locale('vi'),state:{agentDraft:{artifactOutputs:[{name:'x'}],
    verification:[{name:'g'}],loop:{enabled:true,maxIterations:3},hooks:[]},
    data:{executors:[]}},result:'',form,note,
    $:sel=>sel==='#agentForm'?form:sel==='#agentPromptNote'?note:null,
    agentEffectiveModel:()=>'',agentEffortLabel:x=>x,
    agentCopy:(zh,vi)=>vi,syncTabIndicator(){}};
  runInNewContext(source+'\nrenderAgentSummary();result=note.textContent;',ctx);
  assert.equal(ctx.result,'Tự động đính kèm khi chạy: Tên vai trò, 1 sản phẩm đầu ra, 1 bước kiểm tra, Tối đa 3 lượt thử lại');
  assert.doesNotMatch(ctx.result,/[\u3400-\u9fff]/u);
});

test('saving an untouched translated editor preserves raw payload, while edits are intentional',async()=>{
  for(const edited of [false,true]){
    const role={...seedRole};
    const f={elements:{
      id:{value:role.id},name:{value:edited?'Tên vai trò mới':'Tác tử đồng bộ baseline'},
      description:{value:''},shared:{checked:true},executorId:{value:'codebuddy'},
      effort:{value:''},platformMcp:{checked:false},knowledgeBase:{checked:false}
    },querySelectorAll:()=>[]};
    const context={f,window:locale('vi'),result:null,
      state:{data:{agents:[role],rules:[],skills:[]},projectFilter:'',
        workflow:{generic:false},selectedAgent:role.id,
        agentSeedNameOriginal:role.name,agentSeedNameEdited:edited},
      readAgentDraft:()=>({prompt:edited?'Prompt tiếng Việt mới':seedRole.prompt,
        artifactOutputs:[],verification:[],hooks:[]}),
      agentGatesForSave:()=>[],catalogGeneric:()=>false,catalogForeign:()=>false,
      renderAgents(){},renderCanvas(){},closeAgentWizard(){},toast(){},
      agentEffectiveModel:()=>'',saved:null,
      api:async(url,options)=>{
        assert.equal(url,'/api/agents');
        context.saved=JSON.parse(options.body);
        return context.saved;
      }};
    runInNewContext(pick(agents,'function agentVI(){','function renderAgentsLegacy(){')+
      pick(agents,'async function persistAgentRequest(f,creating){','async function deleteAgent(id){')+
      '\nresult=persistAgentRequest(f,false);',context);
    await context.result;
    assert.equal(context.saved.id,role.id);
    assert.equal(context.saved.name,edited?'Tên vai trò mới':role.name);
    assert.equal(context.saved.prompt,edited?'Prompt tiếng Việt mới':role.prompt);
  }
});
