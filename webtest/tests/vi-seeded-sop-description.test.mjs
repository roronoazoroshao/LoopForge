import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../../web/app/sops.js',import.meta.url),'utf8');
const seedSQL=readFileSync(new URL('../../migrations/seed/001_public_catalog.sql',import.meta.url),'utf8');
const start=source.indexOf('const SOP_SEED_DESCRIPTION_COPY=');
const end=source.indexOf('\nfunction sopCatalogCard(',start);
assert.ok(start>=0&&end>start,'SOP catalog localization and card renderer must be present');
const cardSource=source.slice(start,end);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function render(workflow,lang){
  const context={
    workflow,
    result:'',
    state:{projectFilter:'project-1',data:{workflows:[]}},
    catalogGeneric:w=>!!w?.generic,
    lfT:(zh,en,vi)=>lang==='vi'?vi:lang==='en'?en:zh,
    escapeHTML,
    sopCardHead:()=>'',sopStatusBadge:()=>'',sopBadge:()=>'',sopCardTitle:()=>'',sopRunRequirementChips:()=>'',
    genericRequirementChips:()=>'',sopCardPrimary:()=>'button',sopCardMoreButton:()=>''
  };
  runInNewContext(cardSource+'\nresult=genericSOPCard(workflow);',context);
  return context.result;
}

const originals=[
  {
    id:'generic-backend-delivery',
    zh:'后端需求从需求定型到独立评审与交付。',
    en:'Take backend requirements from scoping through independent review to delivery.',
    vi:'Đưa yêu cầu backend từ bước làm rõ đến rà soát độc lập và bàn giao.'
  },
  {
    id:'generic-frontend-delivery',
    zh:'前端需求从页面设计到交互与回归验证。',
    en:'Take frontend requirements from page design through interaction and regression verification.',
    vi:'Đưa yêu cầu frontend từ thiết kế giao diện đến kiểm chứng tương tác và hồi quy.'
  },
  {
    id:'generic-product-delivery',
    zh:'完成需求分析、产品方案文档与独立验收；无需代码仓库或 Git Token。',
    en:'Complete requirements analysis, a product proposal, and independent acceptance; no repository or Git token is required.',
    vi:'Hoàn thành phân tích yêu cầu, tài liệu đề xuất sản phẩm và nghiệm thu độc lập; không cần kho mã hay Git Token.'
  },
  {
    id:'issue-fix-production',
    zh:'先复现，再修复，独立评审并回归。',
    en:'Reproduce the issue, fix it, independently review it, then run regression tests.',
    vi:'Tái hiện lỗi, sửa lỗi, rà soát độc lập rồi kiểm thử hồi quy.'
  }
];

for(const {id,zh,en,vi} of originals){
  test('original platform SOP '+id+' localizes its description in VI, EN, ZH',()=>{
    assert.ok(seedSQL.includes('"description": "'+zh+'"'),'fixture must match the opt-in platform seed');
    const workflow={id,description:zh,generic:true,nodes:[],tags:[],owner:'LoopForge'};
    const viHTML=render(workflow,'vi');
    const enHTML=render(workflow,'en');
    const zhHTML=render(workflow,'zh');
    assert.ok(viHTML.includes('<p data-i18n-skip>'+vi+'</p>'),viHTML);
    assert.ok(enHTML.includes('<p data-i18n-skip>'+en+'</p>'),enHTML);
    assert.ok(zhHTML.includes('<p data-i18n-skip>'+zh+'</p>'),zhHTML);
    assert.ok(!viHTML.includes(zh),'Chinese description leaked into VI view');
    assert.ok(!enHTML.includes(zh),'Chinese description leaked into EN view');
    assert.equal(workflow.description,zh,'the underlying data must not change');
  });
}

test('an admin-edited built-in description is preserved and HTML-escaped',()=>{
  const description='Nội dung riêng <script>alert(1)</script> 设计';
  const html=render({id:'generic-backend-delivery',description,nodes:[],tags:[]},'vi');
  assert.ok(html.includes('<p data-i18n-skip>Nội dung riêng &lt;script&gt;alert(1)&lt;/script&gt; 设计</p>'),html);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes(originals[0].vi));
});

test('unrecognized template IDs do not translate user-owned text even if it matches the seed',()=>{
  const html=render({id:'custom-workflow',description:originals[0].zh,nodes:[],tags:[]},'vi');
  assert.ok(html.includes('<p data-i18n-skip>'+originals[0].zh+'</p>'),html);
});

test('a template without a description receives localized UI fallback',()=>{
  const blank={id:'custom-workflow',description:'',nodes:[],tags:[]};
  assert.ok(render(blank,'vi').includes('<p data-i18n-skip>Mẫu quy trình chung do nền tảng cung cấp</p>'));
  assert.ok(render(blank,'en').includes('<p data-i18n-skip>A general workflow template provided by the platform</p>'));
  assert.ok(render(blank,'zh').includes('<p data-i18n-skip>平台提供的通用流程模板</p>'));
});
