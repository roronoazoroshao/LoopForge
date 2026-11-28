import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const file = path => readFileSync(new URL('../../web/' + path, import.meta.url), 'utf8');
const css = file('app/mcp.css');
const mcp = file('app/mcp.js');
const agents = file('app/agents.js');
const runners = file('app/runners.js');
const seeds = readFileSync(new URL('../../migrations/seed/001_public_catalog.sql', import.meta.url), 'utf8');
const locale = lang => ({
  lfLang: () => lang,
  lfT: (zh, en, vi) => lang === 'vi' ? vi : lang === 'en' ? en : zh
});

function mcpScopeHint(project, lang = 'vi') {
  const start = mcp.indexOf('function mcpScopeDescription(');
  const end = mcp.indexOf('\nfunction mcpEmptyDescription(', start);
  assert.ok(start >= 0 && end > start, 'MCP scope helpers not found');
  const ctx = { project, window: locale(lang), result: null };
  runInNewContext(
    mcp.slice(start, end) + '\nresult=mcpProjectScopeHint(project);',
    ctx
  );
  return ctx.result;
}

function roleName(agent, lang = 'vi') {
  const start = agents.indexOf('function agentPublicRoleDisplayName(');
  const end = agents.indexOf('\nfunction renderAgentsLegacy(', start);
  assert.ok(start >= 0 && end > start, 'seeded role name helper missing');
  const ctx = { agent, window: locale(lang), result: null };
  runInNewContext(agents.slice(start, end) + '\nresult=agentPublicRoleDisplayName(agent);', ctx);
  return ctx.result;
}

function runnerPoolLabel({ defaultId = '', machines = [], pool = null, lang = 'vi' } = {}) {
  const start = runners.indexOf('const def=runners.find(r=>r.id===defaultId),pool=state.cloudPool;');
  const end = runners.indexOf('if(runnerVI())poolStatus', start);
  assert.ok(start >= 0 && end > start, 'runner pool label logic missing');
  const ctx = {
    runners: machines,
    defaultId,
    state: { cloudPool: pool },
    runnerUICopy: (zh, vi) => lang === 'vi' ? vi : zh,
    result: null
  };
  runInNewContext(runners.slice(start, end) + '\nresult={text,warn};', ctx);
  return ctx.result;
}

test('MCP and scheduled-task scope selectors localize CSS-generated labels', () => {
  assert.match(css, /html\[data-lang="en"\]\s+:is\(#mcpView,\s*#aiSchedulesView\)\s+\.hui-select-trigger::before\s*\{\s*content:\s*"Scope"/);
  assert.match(css, /html\[data-lang="vi"\]\s+:is\(#mcpView,\s*#aiSchedulesView\)\s+\.hui-select-trigger::before\s*\{\s*content:\s*"Phạm vi"/);
  assert.match(css, /:is\(#mcpView,\s*#aiSchedulesView\)\s+\.hui-select-trigger::before\s*\{\s*content:\s*"范围"/);
});

test('missing MCP project renders an actual Vietnamese empty-state hint', () => {
  assert.equal(mcpScopeHint(null), 'Chưa chọn dự án. Hãy chọn dự án trước khi thêm MCP.');
  assert.equal(mcpScopeHint(null, 'en'), 'No project selected. Choose a project before adding MCP.');
  assert.match(mcp, /mcpProjectScopeHint\(project\)/, 'render path must use the helper');
  assert.doesNotMatch(mcpScopeHint(null), /[\u3400-\u9fff]/u);
});

test('existing project names including Chinese are still user-owned data', () => {
  const name = 'Dự án 未选择项目 中文';
  assert.equal(mcpScopeHint({ id: 'p1', name }), 'Được thêm vào dự án “' + name + '”; không xuất hiện ở dự án khác.');
  assert.equal(mcpScopeHint({ id: 'p1', name: '未选择项目' }), 'Được thêm vào dự án “未选择项目”; không xuất hiện ở dự án khác.');
  assert.equal(mcpScopeHint({ id: 'p1', name: '' }), 'Được thêm vào dự án “p1”; không xuất hiện ở dự án khác.');
});

test('only the actual public baseline-alignment role gets a localized display name', () => {
  assert.match(seeds, /'baseline-align-resolver','基线对齐执行员'/);
  const role = { id: 'baseline-align-resolver', name: '基线对齐执行员', shared: true };
  assert.equal(roleName(role, 'vi'), 'Tác tử đồng bộ baseline');
  assert.equal(roleName(role, 'en'), 'Baseline alignment executor');
  assert.equal(roleName(role, 'zh'), '基线对齐执行员');
  assert.equal(role.name, '基线对齐执行员', 'stored role payload must remain untouched');
  assert.match(agents, /escapeHTML\(agentPublicRoleDisplayName\(a\)\)/, 'list display must use localized label');
  assert.match(agents, /agentPublicRoleDisplayName\(a\)\} \$\{a\.name\}/, 'search must find visible and original names');
});

test('custom role names and admin-edited seed roles are never translated', () => {
  assert.equal(roleName({ id: 'my-custom', name: '基线对齐执行员' }), '基线对齐执行员');
  assert.equal(roleName({ id: 'baseline-align-resolver', projectId: 'p1', name: '基线对齐执行员' }), '基线对齐执行员');
  assert.equal(roleName({ id: 'baseline-align-resolver', name: 'Người dùng đặt tên 中文' }), 'Người dùng đặt tên 中文');
});

test('unconfigured cloud runner pool has localized Vietnamese status', () => {
  const label = runnerPoolLabel();
  assert.equal(label.text, 'Thực thi trên đám mây của nền tảng');
  assert.equal(label.warn, false);
  assert.doesNotMatch(label.text, /[\u3400-\u9fff]/u);
});

test('cloud pool counts and an offline default runner keep their existing semantics', () => {
  assert.equal(runnerPoolLabel({pool: {configured:true,online:2}}).text, 'Thực thi đám mây · 2 máy trực tuyến');
  assert.equal(runnerPoolLabel({pool: {configured:true,online:0}}).warn, true);
  const offline=runnerPoolLabel({defaultId:'runner1',machines:[{id:'runner1',name:'Máy 中文',status:'offline'}]});
  assert.equal(offline.warn, true);
  assert.match(offline.text, /Máy mặc định đã ngoại tuyến/);
});
