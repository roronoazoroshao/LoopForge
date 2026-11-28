import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const obs=read('web/app/observability.js');
const sops=read('web/app/sops.js');
const assets=read('web/app/assets.js');
const skillhub=read('web/app/skillhub.js');
const take=(s,start,end)=>{
  const a=s.indexOf(start),b=s.indexOf(end,a);
  assert.ok(a>=0&&b>a,'expected source boundary: '+start);
  return s.slice(a,b);
};
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[ch]);
const localize=(lang,zh,vi)=>lang==='vi'?vi:zh;

function renderDelivery(lang,delivery,summary){
  const context={
    state:{analytics:{delivery,summary}}, result:'',
    obsUi:(zh,vi)=>localize(lang,zh,vi),
    obsScope:()=> 'project',
    obsKpiGroups:groups=>groups.join(' '),
    obsKpiGroup:(title,items)=>title+' '+items.map(item=>[
      item.label,item.value,item.foot,...(item.tip||[])
    ].flat(Infinity).join(' ')).join(' '),
    obsInsights:()=>'',obsScopedView:()=>({}),
    obsFunnelCard:()=>'',obsOwnersCard:()=>'',obsDeliveriesCard:()=>'',
    duration:x=>String(x)+'ms',formatTokens:x=>String(x)
  };
  runInNewContext('let obsCardBuilders={};'+take(obs,'function obsDelivery(){','function obsFunnelCard(){')+
    '\nresult=obsDelivery();',context);
  return context.result;
}

test('delivery KPI footers and tooltips render VI at zero and nonzero counts, ZH remains Chinese',()=>{
  for(const [delivery,summary] of [
    [{},{}],
    [{issues:12,directIssues:3,delivered:7,mrMerged:5,mrIntegrated:4,requirementCount:2,bugFixCount:5},
      {weeklyDeliveredIssues:7,weeklyActiveContributors:3,runsPerIssue:2.5,failuresPerIssue:1.25,inProgressIssues:2}]
  ]){
    const vi=renderDelivery('vi',delivery,summary),zh=renderDelivery('zh',delivery,summary);
    assert.doesNotMatch(vi,/[\u3400-\u9fff]/u,vi);
    assert.match(vi,/LOOP thành công hoặc bàn giao trực tiếp/);
    assert.match(vi,/người đóng góp/);
    assert.match(zh,/交付结果/);
    assert.match(zh,/近 7 天/);
  }
});

test('delivery filter chips render VI classifiers without altering counts',()=>{
  const context={state:{obsDeliveryFilter:'all',analytics:{deliveries:[{},{},{}]}},result:'',
    OBS_DELIVERY_FILTERS:[],obsUi:(zh,vi)=>vi,obsDeliveryMatches:()=>true,
    obsDeliveryTableDef:()=>({items:[{},{},{}],filter:'all',tables:[{}]}),
    obsDetailTable:()=>'',obsIcon:()=>'',obsCard:(k,t,sub,action,body)=>t+sub+action+body,
    escapeHTML,obsUserName:()=>''};
  const filters=take(obs,'const OBS_DELIVERY_FILTERS=','function obsDeliveryMRs(');
  // A top-level const from the source is shared with the renderer in one script.
  delete context.OBS_DELIVERY_FILTERS;
  runInNewContext(filters+take(obs,'function obsDeliveriesCard(){','function obsPlain(')+
    '\nresult=obsDeliveriesCard();',context);
  assert.match(context.result,/3 yêu cầu/);
  assert.doesNotMatch(context.result,/[\u3400-\u9fff]/u);
});

test('Vietnamese scope copy keeps source project names, including Chinese names',()=>{
  const context={result:'',obsUi:(zh,vi)=>vi};
  runInNewContext(take(obs,'function obsScopeChipText(','function obsScopeHintText(')+
    '\nresult=obsScopeChipText("project","当前项目");',context);
  assert.match(context.result,/Mọi thành viên của dự án “当前项目”/);
});

test('grain labels are localized for day, week, month, all',()=>{
  for(const [grain,expected] of [['day','ngày'],['week','tuần'],['month','tháng'],['all','tháng']]){
    const context={result:'',obsTrendGrain:()=>grain,obsUi:(zh,vi)=>vi};
    runInNewContext(take(obs,'function obsGrainCaption(){','function obsRangeCaption(){')+
      '\nresult=obsGrainCaption();',context);
    assert.equal(context.result,expected);
  }
});

function renderSopCatalog(lang,scope='generic'){
  const nodes={};
  for(const id of ['sopOverview','sopStats','sopCatalog'])
    nodes['#'+id]={innerHTML:''};
  const state={sopScope:scope,projectFilter:'project-a',data:{workflowMetrics:[],workflows:[]}};
  const context={state,window:{},result:'',
    $:id=>nodes[id]||null,scopedWorkflows:()=>Array.from({length:4},(_,id)=>({
      id:String(id),status:'published',owner:'A'
    })),liveRuns:()=>[],renderCatalogScopes:()=>{},
    sopCatalogMotion:{snapshot:()=>null,play:()=>{}},sopCatalogFocus:()=>null,
    bindSOPCatalogEvents:()=>{},restoreSOPCatalogFocus:()=>{},syncSOPCardMenu:()=>{},
    huiIcon:()=>'',percent:n=>n+'%',formatTokens:String,metricHealth:()=>({key:'ok'}),
    sopCatalogCard:()=>'<article/>',
    sopUICopy:(zh,vi)=>localize(lang,zh,vi),sopVI:()=>lang==='vi'
  };
  runInNewContext(take(sops,'function renderSOPCatalog(){','async function refreshWorkflowMetrics(')+
    '\nrenderSOPCatalog();',context);
  return {overview:nodes['#sopOverview'].innerHTML,stats:nodes['#sopStats'].innerHTML};
}

test('SOP count uses Vietnamese whole phrase but keeps filter and counts',()=>{
  assert.match(renderSopCatalog('vi').overview,/4 LOOP dùng chung/);
  assert.match(renderSopCatalog('vi').stats,/4 đã phát hành/);
  assert.match(renderSopCatalog('vi','shared').overview,/4 LOOP được chia sẻ/);
  assert.match(renderSopCatalog('zh').overview,/4 条通用 LOOP/);
});

const assetFunctions=take(assets,'function assetVI(){','function assetScopeKey(')+
  take(assets,'function assetOwnerProjectName(','function assetIsBuiltin(')+
  take(assets,'function assetStatusHTML(','function assetMetaHTML(')+
  take(assets,'function assetCardHTML(','function assetGridEmptyHTML(');
function renderAsset(lang,asset,type='dockerfiles'){
  const lfT=(zh,en,vi)=>lang==='vi'?(vi??en??zh):lang==='en'?en:zh;
  const context={result:null,window:{lfLang:()=>lang,lfT},lfT,
    state:{assetType:type,data:{projects:[{id:'project-z',name:'当前项目'}]}},
    escapeHTML,catalogOwned:()=>false,assetKindLabel:()=>type,
    assetUILabel:x=>x,assetKindLabelEn:()=>type,assetIconName:()=>'',assetMetaHTML:()=>'',huiIcon:()=>''};
  runInNewContext(assetFunctions+'\nresult={name:assetDisplayName(asset),card:assetCardHTML(asset),status:assetStatusHTML(asset)};',
    {...context,asset});
  // eval with a single mutable context to get result
  const ctx={...context,asset};
  runInNewContext(assetFunctions+'\nresult={name:assetDisplayName(asset),card:assetCardHTML(asset),status:assetStatusHTML(asset)};',ctx);
  return ctx.result;
}

test('seed names are translated only with exact kind, ID and original seed name',()=>{
  const seed={id:'generic-backend',name:'公共开发环境',content:'FROM node:22'};
  assert.equal(renderAsset('vi',seed).name,'Môi trường phát triển dùng chung');
  assert.match(renderAsset('vi',seed).card,/Môi trường phát triển dùng chung/);
  assert.equal(renderAsset('zh',seed).name,'公共开发环境');
  assert.equal(renderAsset('vi',{...seed,name:'Đã đổi tên'}).name,'Đã đổi tên');
  assert.equal(renderAsset('vi',{...seed,id:'another-id'}).name,'公共开发环境');
  assert.equal(renderAsset('vi',seed,'sandboxes').name,'公共开发环境');
  assert.equal(renderAsset('vi',{id:'generic-docker',name:'Docker 隔离沙箱'},'sandboxes').name,'Sandbox cách ly bằng Docker');
  assert.equal(renderAsset('vi',{id:'local',name:'本地执行（仅可信任务）'},'sandboxes').name,'Thực thi cục bộ (chỉ tác vụ đáng tin cậy)');
});

test('platform attribution is UI text; a project name remains raw',()=>{
  assert.match(renderAsset('vi',{id:'generic-backend',name:'公共开发环境'}).status,/Từ nền tảng/);
  assert.match(renderAsset('vi',{id:'custom',projectId:'project-z',name:'abc'}).status,/Từ dự án <span data-i18n-skip>当前项目<\/span>/);
  assert.match(renderAsset('zh',{id:'generic-backend',name:'公共开发环境'}).status,/来自 平台/);
});

test('SkillHub keeps external author data and translates its own UI',()=>{
  const functions=take(skillhub,'function skillhubVI(){','const SKILLHUB_PAGE_SIZE=')+
    take(skillhub,'function skillhubCategoryName(','function skillhubSecurityRows(');
  const context={result:'',window:{lfLang:()=>'vi'},
    state:{projectFilter:'p1'},escapeHTML,
    skillhubState:()=>({categories:[{key:'external',name:'用户类别'}]}),
    skillhubCardState:()=>({state:'installed',version:'1.0'}),
    skillhubLabelBadges:()=>[],skillhubBadge:(tone,label)=>label,
    skillhubCount:n=>String(n||0),skillhubTile:()=>'',huiIcon:()=>'',skillhubLamp:()=>''};
  // Only the listing UI is localizable; names/descriptions are external data.
  runInNewContext(functions+'\nresult=skillhubCardHTML({name:"编程专家.Skill",slug:"dev",description:"作者原文",category:"external",downloads:2,stars:1},0);',context);
  assert.match(context.result,/data-i18n-skip>编程专家.Skill/);
  assert.match(context.result,/data-i18n-skip>作者原文/);
  assert.match(context.result,/data-i18n-skip>用户类别/);
  assert.match(context.result,/Đã cài đặt v1.0/);
  assert.match(context.result,/data-i18n-aria-skip/);
});

test('SkillHub pagination uses VI text and accessible previous/next labels',()=>{
  const context={result:'',window:{lfLang:()=>'vi'},
    skillhubState:()=>({page:1,total:48,items:[{}],loading:false,error:''}),
    $:()=>({set hidden(v){},set innerHTML(v){context.result=v;}}),
    SKILLHUB_PAGE_SIZE:24,skillhubPageList:()=>[1,2],huiIcon:()=>''};
  runInNewContext(take(skillhub,'function skillhubVI(){','const SKILLHUB_PAGE_SIZE=')+
    take(skillhub,'function renderSkillhubPager(){','async function loadSkillhubMarket(')+
    '\nrenderSkillhubPager();',context);
  assert.match(context.result,/Trang 1 \/ 2/);
  assert.match(context.result,/aria-label="Trang trước"/);
  assert.match(context.result,/aria-label="Trang tiếp"/);
});

function renderExportedReport(lang,summary={},delivery={},projectName='当前项目'){
  const state={obsScope:'project',obsTrendGrain:'all',data:{workflows:[]},
    analytics:{summary,delivery,deliveries:[],workflows:[],models:[],userUsage:[],
      issueSources:[],workflowVersions:[],trend:[],projectUsage:[]}};
  const context={state,result:'',
    currentProject:()=>({id:'p1',name:projectName}),obsScope:()=>state.obsScope,
    obsUi:(zh,vi)=>localize(lang,zh,vi),obsSourceLabel:()=>'',obsUserName:()=>'',
    obsUserTotals:()=>[],obsProjectName:()=>'',obsTrendWindow:x=>x,
    obsTrendLabel:()=>'',obsDeliveryStatusText:()=>'',obsDeliveryMRHTML:()=>'',obsActivityUsageCard:()=>({label:'',value:0,foot:''}),
    obsPlain:x=>x,costLabel:()=>'$0',escapeHTML,percent:x=>String(x??0)+'%',
    formatTokens:x=>String(x??0),duration:x=>String(x)+'ms',
    obsGrainCaption:()=>lang==='vi'?'tháng':'月'};
  const reportSource=take(obs,'function obsCostUnknown(','function obsScopedView(){')+take(obs,'function obsDeliveryIssueKey(','function obsDeliveryTableDef(')+take(obs,'function obsReportScope(){','async function exportObsReport(){')+
    take(obs,'function buildObsReportHTML(){','function obsCanManageSources(){');
  runInNewContext(reportSource+'\nresult=buildObsReportHTML();',context);
  return context.result;
}

test('exported HTML is a self-contained Vietnamese report and retains project data',()=>{
  for(const [summary,delivery] of [
    [{},{}],
    [{totalRuns:5,activeRuns:2,succeededRuns:3,failedRuns:2,conversationIssues:2,
      conversationWorkspaces:1,conversationTokens:1500,conversationCostCny:2,cacheReadTokens:20},
      {delivered:3,issues:4,mrIntegrated:2,mrMerged:3}]
  ]){
    const vi=renderExportedReport('vi',summary,delivery);
    assert.match(vi,/<html lang="vi-VN">/);
    assert.match(vi,/Báo cáo phân tích mức sử dụng/);
    assert.match(vi,new RegExp(`${delivery.issues||0} yêu cầu có lượt chạy`));
    assert.match(vi,/当前项目/,'project name is data, not a translation key');
    assert.doesNotMatch(vi.replaceAll('当前项目',''),/[\u3400-\u9fff]/u);
    const zh=renderExportedReport('zh',summary,delivery);
    assert.match(zh,/<html lang="zh-CN">/);
    assert.match(zh,/用量分析报告/);
  }
});

test('observability filters are Vietnamese in both personal and project modes without rewriting names',()=>{
  for(const scope of ['user','project']){
    const state={obsScope:scope,obsTrendGrain:'all',currentUser:{id:1},
      obsOriginFilter:'internal',obsSourceFilter:'local',obsUserFilter:'',data:{users:[]}};
    const context={state,result:'',window:{lfLang:()=>'vi'},
      currentProject:()=>({name:'当前项目',id:'p1'}),obsScope:()=>scope,
      obsTrendGrain:()=>'all',ensureObsUserFilter:()=>{},userById:()=>null,
      obsUserName:()=>'',obsUserChoices:()=>[],obsCanManageSources:()=>false,
      obsSeg:(key,opts)=>opts.map(o=>o[1]).join(' · '),obsPeriodPicker:()=>'',
      obsPeriodRange:()=>null,obsRangeCaption:()=>'',obsSourceLabel:()=> 'Cục bộ',
      obsIcon:()=>'',escapeHTML};
    runInNewContext(take(obs,'function obsUi(zh,vi)','function obsFilteredRuns(){')+
      '\nresult=obsFilterBar();',context);
    assert.match(context.result,scope==='project'?/Mọi thành viên của dự án “当前项目”/:/Dự án “当前项目” · Mọi thành viên/);
    assert.match(context.result,/Tất cả/);
    assert.match(context.result,/aria-label="Nguồn yêu cầu"/);
    assert.match(context.result,/当前项目/);
    assert.doesNotMatch(context.result.replaceAll('当前项目',''),/[\u3400-\u9fff]/u);
  }
});
