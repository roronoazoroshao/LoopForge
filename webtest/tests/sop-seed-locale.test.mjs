import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadApp, chooseOption, settle, sampleBootstrap } from '../lib/load-app.mjs';

const templateId = 'generic-backend-delivery';
const stages = [
  ['clarify', '需求定型', 'Chốt yêu cầu', 'Requirement scoping'],
  ['design', '方案设计', 'Thiết kế giải pháp', 'Solution design'],
  ['implement', '开发实现', 'Triển khai', 'Implementation'],
  ['review', '独立评审', 'Rà soát độc lập', 'Independent review'],
  ['test', '测试验证', 'Kiểm thử và xác minh', 'Testing and verification'],
  ['deliver', '交付汇总', 'Tổng hợp bàn giao', 'Delivery summary'],
  ['mr', '发起 MR', 'Tạo Merge Request', 'Create Merge Request'],
];
const seed = readFileSync(new URL('../../migrations/seed/001_public_catalog.sql', import.meta.url), 'utf8');

function fixture() {
  const agents = stages.map(([stage, name]) => ({
    id: templateId + '-' + stage, name, projectId: '', executorId: 'codebuddy',
    description: '', artifactOutputs: [], verification: [],
  }));
  agents.push({ id: 'custom-chinese-role', name: '自定义角色', projectId: '',
    executorId: 'codebuddy', description: '用户自定义内容' });
  const nodes = stages.map(([stage, name], index) => ({
    id: stage, name, type: 'agent', agentId: templateId + '-' + stage,
    position: { x: index * 260, y: 100 }, artifactOutputs: [], onFailure: 'fail',
  }));
  return { agents, workflow: { id: templateId, name: '通用后端交付 SOP', generic: true,
    status: 'published', tags: ['public'], nodes, edges: [], sandboxProfileId: 'local' } };
}

test('the shipped default role/node IDs and names remain stable in the SQL seed', () => {
  for (const [stage, name] of stages) {
    assert.ok(seed.includes('"id": "' + templateId + '-' + stage + '", "name": "' + name + '"'),
      'the role locale map must track the actual seeded role ' + stage);
    assert.ok(seed.includes('"id": "' + stage + '", "name": "' + name + '"'),
      'the node locale map must track the actual seeded node ' + stage);
  }
});

for (const [lang, displayIndex] of [['vi', 2], ['en', 3], ['zh', 1]]) {
  test('SOP seed roles render consistently in '+lang+' from API to palette, dropdown, drawer, canvas and rerender', async t => {
    const app = await loadApp({ locale: lang });
    t.after(app.close);
    const { agents, workflow } = fixture();
    app.router.get('/api/workflows/' + templateId + '/agents', agents);
    app.evaluate('switchView("flow")');
    app.evaluate('state.workflow=' + JSON.stringify(workflow) + ';state.selectedNode="clarify";'
      + 'state.genericTemplateAgents=[];state.genericTemplateAgentWorkflowId="";');
    await app.evaluate('refreshGenericWorkflowRoles()');
    app.evaluate('flowPalette.render();renderProperties();renderCanvas();');
    await settle(2);

    const optionTexts = [...app.document.querySelectorAll('#properties select[data-p="agentId"] option')]
      .map(option => option.textContent.trim());
    const titles = [...app.document.querySelectorAll('#nodes .node-title')]
      .map(el => el.textContent.trim());
    const subtitles = [...app.document.querySelectorAll('#nodes .node-subtitle')]
      .map(el => el.textContent.trim());
    const palette = [...app.document.querySelectorAll('#flowPaletteRoles .fd-pal-text b')]
      .map(el => el.textContent.trim());

    for (const [i, stage] of stages.entries()) {
      const wanted = stage[displayIndex];
      assert.ok(optionTexts.includes(wanted), 'dropdown: ' + wanted);
      assert.equal(titles[i], wanted, 'canvas title: ' + wanted);
      assert.equal(subtitles[i], wanted, 'canvas role: ' + wanted);
      assert.ok(palette.includes(wanted), 'palette: ' + wanted);
    }
    const first = stages[0][displayIndex];
    const accessibleLabel = { vi: 'Vai trò cho bước này', en: 'Role for this step',
      zh: '这个步骤用哪个角色' }[lang];
    assert.equal(app.document.querySelector('#flowAgentSelect')?.getAttribute('aria-label'), accessibleLabel);
    assert.equal(app.document.querySelector('label[for="flowAgentSelect"]')?.textContent, accessibleLabel);
    assert.equal(app.document.querySelector('#properties .fd-role-t b')?.textContent, first);
    assert.equal(app.document.querySelector('#properties .fd-dh-name')?.value, first);
    assert.match(app.document.querySelector('#properties .fd-field .prop-hint')?.textContent||'',
      lang==='vi'?/Những vai trò này thuộc mẫu chung/:lang==='en'?/These roles are bundled/:/这些角色打包/);

    // Names are presentation only, never a mutation of source payloads.
    assert.equal(app.evaluate('state.workflow.nodes[0].name'), '需求定型');
    assert.equal(app.evaluate('state.genericTemplateAgents[0].name'), '需求定型');
    assert.equal(app.evaluate('state.workflow.nodes[0].agentId'), templateId + '-clarify');
    assert.ok(optionTexts.includes('自定义角色'), 'custom Chinese role must remain untouched');

    // Changing an agent saves the stable ID, and repainting restores the same locale.
    const select = app.document.querySelector('#properties select[data-p="agentId"]');
    chooseOption(select, templateId + '-design');
    select.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    assert.equal(app.evaluate('state.workflow.nodes[0].agentId'), templateId + '-design');
    app.evaluate('renderProperties();renderCanvas();flowPalette.render();');
    assert.equal(app.document.querySelector('#properties .fd-role-t b')?.textContent, stages[1][displayIndex]);
    assert.equal(app.evaluate('state.workflow.nodes[0].name'), '需求定型');
  });
}


test('cloned template roles and legacy seed names translate only with verified IDs', async t => {
  for (const [lang, expected] of [['vi', 'Triển khai'], ['en', 'Implementation'], ['zh', '实施']]) {
    const app = await loadApp({ locale: lang });
    t.after(app.close);
    const source = { id: 'copied-1', projectId: 'project-1',
      tags: ['generic-source:generic-backend-delivery'], generic: false };
    const role = { id: templateId + '-implement-project-1', projectId: 'project-1', name: '实施' };
    const node = { id: 'implement', name: '实施', type: 'agent' };
    app.evaluate('state.workflow=' + JSON.stringify(source) + ';');
    assert.equal(app.evaluate('sopSeedRoleDisplayName(' + JSON.stringify(role) + ',state.workflow)'), expected);
    assert.equal(app.evaluate('sopSeedNodeDisplayName(' + JSON.stringify(node) + ',state.workflow)'), expected);
    assert.equal(app.evaluate('sopSeedRoleDisplayName(' + JSON.stringify({ ...role, name: '自定义角色' }) + ',state.workflow)'), '自定义角色');
    assert.equal(app.evaluate('sopSeedRoleDisplayName(' + JSON.stringify({ ...role, id: 'custom-role' }) + ',state.workflow)'), '实施');
    assert.equal(app.evaluate('sopSeedNodeDisplayName(' + JSON.stringify({ ...node, name: '用户更名' }) + ',state.workflow)'), '用户更名');
    assert.equal(app.evaluate('sopSeedNodeDisplayName(' + JSON.stringify(node) + ',{id:"custom-sop",tags:[]})'), '实施');
  }
});

test('deep-link and reload open the public generic SOP without exposing private workflows', async t => {
  const { workflow, agents } = fixture();
  const bootstrap = sampleBootstrap();
  bootstrap.workflows.push(workflow);
  bootstrap.workflows.push({
    id: 'private-elsewhere', projectId: 'different-project', shared: false,
    name: 'Private', nodes: [{ id: 'x', name: 'Do not open', type: 'script',
      position: { x: 100, y: 80 } }], edges: [],
  });
  const routes = [
    { method: 'GET', path: '/api/bootstrap', body: bootstrap },
    { method: 'GET', path: '/api/workflows/' + templateId + '/agents', body: agents },
  ];
  const app = await loadApp({ locale: 'vi', hash: '#/flow/' + templateId, routes });
  t.after(app.close);
  await settle(8);
  assert.equal(app.evaluate('state.workflow?.id'), templateId, 'the link must restore the public template');
  assert.equal(app.document.querySelectorAll('#nodes .flow-node').length, stages.length);
  assert.equal(app.document.querySelector('#nodes [data-id="clarify"] .node-title')?.textContent, 'Chốt yêu cầu');
  assert.equal(app.evaluate('state.genericTemplateAgents.length'), agents.length);
  assert.equal(app.evaluate('openableWorkflow("private-elsewhere")'), null,
    'private workflows from other projects must remain inaccessible');
});

test('custom Chinese role names, descriptions and model IDs stay untouched in the role catalog', async t => {
  for (const lang of ['vi', 'en', 'zh']) {
    const app = await loadApp({ locale: lang });
    t.after(app.close);
    const role = { id: 'custom-l10n-role', projectId: 'project-1',
      name: '用户自定义角色', description: '用户手写的职责', model: '自定义模型' };
    app.evaluate('state.data.agents.push(' + JSON.stringify(role) + ');'
      + 'state.agentScope="project";renderAgents();');
    const row = app.document.querySelector('#agentList [data-agent-id="custom-l10n-role"]');
    assert.ok(row, 'custom role row exists in ' + lang);
    assert.equal(row.querySelector('.agent-row-who b').textContent, role.name);
    assert.equal(row.querySelector('.agent-row-who small').textContent, role.description);
    assert.equal(row.querySelector('.agent-row-model').textContent, role.model);
    assert.ok(row.querySelector('.agent-row-who b').hasAttribute('data-i18n-skip'));
    assert.ok(row.querySelector('.agent-row-who small').hasAttribute('data-i18n-skip'));
    assert.ok(row.querySelector('.agent-row-model').hasAttribute('data-i18n-skip'));
    assert.equal(app.evaluate('state.data.agents.find(a=>a.id==="custom-l10n-role").name'), role.name);
  }
});


test('all shipped template names localize by ID without translating user-created SOPs', async t => {
  const known = [
    ['generic-backend-delivery', '通用后端交付 SOP', 'General backend delivery SOP', 'SOP bàn giao backend chung'],
    ['generic-frontend-delivery', '通用前端交付 SOP', 'General frontend delivery SOP', 'SOP bàn giao frontend chung'],
    ['issue-fix-production', '通用缺陷修复 SOP', 'General bug-fix SOP', 'SOP sửa lỗi chung'],
    ['generic-product-delivery', '通用产品方案 SOP', 'General product proposal SOP', 'SOP đề xuất sản phẩm chung'],
  ];
  for (const [lang, offset] of [['zh',1],['en',2],['vi',3]]) {
    const app = await loadApp({ locale: lang });
    t.after(app.close);
    for (const [id, raw, en, vi] of known) {
      assert.ok(seed.includes('"id": "' + id + '", "name": "' + raw + '"'), id + ' must still exist in seed');
      const source = { id, name: raw, generic: true };
      assert.equal(app.evaluate('sopSeedWorkflowDisplayName(' + JSON.stringify(source) + ')'), { zh: raw, en, vi }[lang]);
      assert.equal(app.evaluate('sopSeedWorkflowDisplayName(' + JSON.stringify({ ...source, generic: false }) + ')'), raw);
      assert.equal(app.evaluate('sopSeedWorkflowDisplayName(' + JSON.stringify({ ...source, name: '用户改名' }) + ')'), '用户改名');
    }
  }
});
