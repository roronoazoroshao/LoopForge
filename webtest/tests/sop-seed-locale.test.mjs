import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadApp, chooseOption, settle } from '../lib/load-app.mjs';

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
    assert.equal(app.document.querySelector('#properties .fd-role-t b')?.textContent, first);
    assert.equal(app.document.querySelector('#properties .fd-dh-name')?.value, first);

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
