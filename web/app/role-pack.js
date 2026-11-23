// Import/export portable role definitions using the existing /api/agents API.
// Intentionally isolated from the role wizard and persistence layer.
// A pack describes role contracts; it never installs Skill files or executes scripts.
(() => {
  'use strict';
  const FORMAT = 'loopforge-role-pack';
  const SCHEMA = 1;
  const MAX_BYTES = 1024 * 1024;
  const MAX_ROLES = 50;
  const ROLE_FIELDS = [
    'id', 'name', 'description', 'prompt', 'executorId', 'model', 'effort',
    'rules', 'skills', 'mcpServers', 'platformMcp', 'knowledgeBase', 'hooks',
    'loop', 'interventions', 'artifactOutputs', 'verification',
  ];
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const fail = message => { throw new Error(message); };
  const fields = (object, allowed, path) => {
    if (!isObject(object)) fail(path + ': expected an object');
    for (const key of Object.keys(object)) {
      if (!allowed.includes(key)) fail(path + ': unsupported field ' + key);
    }
  };
  const str = (value, path, max = 100000, required = false) => {
    if (value === undefined && !required) return '';
    if (typeof value !== 'string') fail(path + ': expected text');
    if (value.length > max || (required && !value.trim())) fail(path + ': invalid length');
    return value;
  };
  const bool = (value, path, fallback = false) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'boolean') fail(path + ': expected true or false');
    return value;
  };
  const integer = (value, path, min, max, fallback) => {
    if (value === undefined) return fallback;
    if (!Number.isInteger(value) || value < min || value > max) fail(path + ': expected an integer from ' + min + ' to ' + max);
    return value;
  };
  const choice = (value, path, options, fallback) => {
    if (value === undefined) return fallback;
    if (!options.includes(value)) fail(path + ': unsupported value ' + String(value));
    return value;
  };
  const list = (value, path, max = 100) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > max) fail(path + ': expected a list of up to ' + max + ' items');
    const output = value.map((id, index) => str(id, path + '[' + index + ']', 160, true).trim());
    if (new Set(output).size !== output.length) fail(path + ': duplicate references');
    return output;
  };
  const safePath = (value, path) => {
    const result = str(value, path, 240, true);
    if (result.startsWith('/') || result.includes('\\') ||
        result.split('/').some(piece => !piece || piece === '.' || piece === '..') ||
        /^[a-zA-Z]:/.test(result) || /[\x00-\x1f]/.test(result)) {
      fail(path + ': path must stay inside the run workspace');
    }
    return result;
  };
  const normalizeArtifact = (raw, path) => {
    fields(raw, ['name', 'path', 'mediaType', 'required'], path);
    return {
      name: str(raw.name, path + '.name', 120, true),
      path: safePath(raw.path, path + '.path'),
      mediaType: choice(raw.mediaType, path + '.mediaType', ['text/markdown', 'application/json'], 'text/markdown'),
      required: bool(raw.required, path + '.required', true),
    };
  };
  const normalizeGate = (raw, path) => {
    fields(raw, ['id', 'name', 'mode', 'stage', 'required', 'onFailure', 'commands', 'executionScope'], path);
    const mode = choice(raw.mode, path + '.mode', ['command', 'mr'], 'command');
    const commands = raw.commands === undefined ? [] : listCommands(raw.commands, path + '.commands');
    if (mode === 'mr' && commands.length) fail(path + ': MR gates must not include shell commands');
    if (mode === 'command' && !commands.length) fail(path + '.commands: at least one command is required');
    const gate = {
      id: str(raw.id, path + '.id', 120, true),
      name: str(raw.name, path + '.name', 120, true),
      mode,
      stage: choice(raw.stage, path + '.stage', ['after_execution'], 'after_execution'),
      required: bool(raw.required, path + '.required', true),
      onFailure: choice(raw.onFailure, path + '.onFailure', ['loop', 'reject', 'fail', 'human'], 'loop'),
    };
    if (mode === 'command') {
      gate.commands = commands;
      gate.executionScope = choice(raw.executionScope, path + '.executionScope', ['run', 'repositories'], 'run');
    }
    return gate;
  };
  const listCommands = (raw, path) => {
    if (!Array.isArray(raw) || raw.length > 20) fail(path + ': expected up to 20 shell commands');
    return raw.map((line, index) => str(line, path + '[' + index + ']', 10000, true)).filter(line => line.trim());
  };
  const normalizeHook = (raw, path) => {
    fields(raw, ['id', 'name', 'event', 'matcher', 'language', 'script', 'timeoutSec', 'executionScope'], path);
    return {
      id: str(raw.id, path + '.id', 120, true),
      name: str(raw.name, path + '.name', 120, true),
      event: choice(raw.event, path + '.event', ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop']),
      matcher: str(raw.matcher, path + '.matcher', 200),
      language: choice(raw.language, path + '.language', ['shell', 'python'], 'shell'),
      script: str(raw.script, path + '.script', 20000, true),
      timeoutSec: integer(raw.timeoutSec, path + '.timeoutSec', 1, 600, 10),
      executionScope: choice(raw.executionScope, path + '.executionScope', ['run', 'repositories'], 'run'),
    };
  };
  const normalizeIntervention = (raw, path) => {
    fields(raw, ['id', 'name', 'stage', 'required', 'instructions'], path);
    return {
      id: str(raw.id, path + '.id', 120, true),
      name: str(raw.name, path + '.name', 120, true),
      stage: choice(raw.stage, path + '.stage', ['after_execution', 'before_publish']),
      required: bool(raw.required, path + '.required', true),
      instructions: str(raw.instructions, path + '.instructions', 5000),
    };
  };
  const normalizeLoop = (raw, path) => {
    raw = raw === undefined ? {} : raw;
    fields(raw, ['enabled', 'maxIterations', 'exitCondition', 'onExhausted', 'feedbackPrompt'], path);
    return {
      enabled: bool(raw.enabled, path + '.enabled'),
      maxIterations: integer(raw.maxIterations, path + '.maxIterations', 1, 12, 3),
      exitCondition: choice(raw.exitCondition, path + '.exitCondition', ['all_gates_pass', 'executor_success'], 'all_gates_pass'),
      onExhausted: choice(raw.onExhausted, path + '.onExhausted', ['fail', 'human'], 'fail'),
      feedbackPrompt: str(raw.feedbackPrompt, path + '.feedbackPrompt', 10000),
    };
  };
  const objectList = (raw, path, normalize, max) => {
    if (raw === undefined) return [];
    if (!Array.isArray(raw) || raw.length > max) fail(path + ': expected up to ' + max + ' items');
    const results = raw.map((item, index) => normalize(item, path + '[' + index + ']'));
    const ids = results.map(item => item.id).filter(Boolean);
    if (ids.length !== new Set(ids).size) fail(path + ': duplicate IDs');
    return results;
  };
  const normalizeRole = (role, path) => {
    fields(role, ROLE_FIELDS, path);
    const id = str(role.id, path + '.id', 96, true).trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) fail(path + '.id: use letters, numbers, dots, underscores, hyphens or colons');
    return {
      id,
      name: str(role.name, path + '.name', 120, true).trim(),
      description: str(role.description, path + '.description', 160),
      prompt: str(role.prompt, path + '.prompt', 100000),
      executorId: str(role.executorId, path + '.executorId', 80),
      model: str(role.model, path + '.model', 200),
      effort: str(role.effort, path + '.effort', 30),
      rules: list(role.rules, path + '.rules'),
      skills: list(role.skills, path + '.skills'),
      mcpServers: list(role.mcpServers, path + '.mcpServers'),
      platformMcp: bool(role.platformMcp, path + '.platformMcp'),
      knowledgeBase: bool(role.knowledgeBase, path + '.knowledgeBase'),
      hooks: objectList(role.hooks, path + '.hooks', normalizeHook, 20),
      loop: normalizeLoop(role.loop, path + '.loop'),
      interventions: objectList(role.interventions, path + '.interventions', normalizeIntervention, 20),
      artifactOutputs: objectList(role.artifactOutputs, path + '.artifactOutputs', normalizeArtifact, 50),
      verification: objectList(role.verification, path + '.verification', normalizeGate, 30),
    };
  };
  const parse = text => {
    if (typeof text !== 'string' || text.length > MAX_BYTES) fail('Role Pack file is too large or invalid (maximum 1 MiB)');
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch (err) { fail('Role Pack must be valid JSON: ' + err.message); }
    fields(data, ['format', 'schemaVersion', 'roles'], 'pack');
    if (data.format !== FORMAT) fail('pack.format must be ' + FORMAT);
    if (data.schemaVersion !== SCHEMA) fail('pack.schemaVersion must be 1');
    if (!Array.isArray(data.roles) || !data.roles.length || data.roles.length > MAX_ROLES) {
      fail('pack.roles must contain between 1 and ' + MAX_ROLES + ' roles');
    }
    const roles = data.roles.map((role, index) => normalizeRole(role, 'roles[' + index + ']'));
    const ids = roles.map(role => role.id);
    if (new Set(ids).size !== ids.length) fail('pack.roles has duplicate role IDs');
    return {format: FORMAT, schemaVersion: SCHEMA, roles};
  };
  const exportPack = roles => {
    if (!Array.isArray(roles) || !roles.length || roles.length > MAX_ROLES) {
      fail('Select between 1 and ' + MAX_ROLES + ' roles for export');
    }
    const clean = roles.map(role => {
      if (!isObject(role)) fail('Invalid role for export');
      const picked = {};
      for (const key of ROLE_FIELDS) if (owns(role, key)) picked[key] = role[key];
      return picked;
    });
    return parse(JSON.stringify({format: FORMAT, schemaVersion: SCHEMA, roles: clean}));
  };
  const preflight = (pack, context) => {
    const errors = [], warnings = [], ready = [];
    const projectId = String(context?.projectId || '').trim();
    if (!projectId) errors.push('Select a destination project first');
    const existing = new Set((context?.existingAgents || []).map(item => item.id));
    const lookup = (values, id) => (values || []).find(item => item.id === id);
    for (const role of pack.roles) {
      if (existing.has(role.id)) errors.push(role.id + ': ID already exists; import will not overwrite it');
      if (role.executorId && !lookup(context?.executors, role.executorId)) {
        errors.push(role.id + ': executor not available: ' + role.executorId);
      }
      for (const [key, items] of [
        ['rules', context?.rules], ['skills', context?.skills],
      ]) {
        for (const id of role[key]) {
          const item = lookup(items, id);
          if (!item || (item.projectId && item.projectId !== projectId && !item.shared)) {
            errors.push(role.id + ': inaccessible ' + key + ' reference: ' + id);
          }
        }
      }
      for (const id of role.mcpServers) {
        const item = lookup(context?.mcpServers, id);
        if (!item || (item.scope === 'project' && item.projectId !== projectId)) {
          errors.push(role.id + ': inaccessible mcpServers reference: ' + id);
        }
      }
      ready.push({
        ...role,
        projectId,
        shared: false,  // Imported roles are private until deliberately shared later.
        version: 1,
      });
    }
    const scriptCount = ready.reduce((count, role) =>
      count + role.hooks.length +
      role.verification.filter(gate => gate.mode === 'command')
        .reduce((total, gate) => total + gate.commands.length, 0), 0);
    if (scriptCount) warnings.push('Shell/Python commands and hooks are stored, but never run during import. Review before running a role.');
    if (ready.some(role => role.platformMcp)) warnings.push('Some roles request access to the platform MCP when executed.');
    return {errors, warnings, ready, scriptCount};
  };
  const importRoles = async (plan, save) => {
    if (!plan || plan.errors.length) fail('Resolve all preflight errors before importing');
    const created = [];
    for (let index = 0; index < plan.ready.length; index++) {
      const role = plan.ready[index];
      try { created.push(await save(role)); }
      catch (error) {
        return {
          created,
          failed: {id: role.id, message: error?.message || String(error)},
          pending: plan.ready.length - index - 1,
        };
      }
    }
    return {created, failed: null, pending: 0};
  };
  const core = Object.freeze({parse, exportPack, preflight, importRoles});
  if (typeof window !== 'undefined') window.LoopForgeRolePack = core;
  if (typeof document === 'undefined') return;

  const $id = id => document.getElementById(id);
  const tr = (zh, en, vi) => window.lfT ? window.lfT(zh, en, vi) : vi;
  let loadedPack = null;
  let reviewedPlan = null;
  let importing = false;
  const status = text => { if ($id('rolePackStatus')) $id('rolePackStatus').textContent = text; };
  const listInto = (id, items) => {
    const host = $id(id);
    if (!host) return;
    host.replaceChildren();
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      host.appendChild(li);
    }
  };
  const modal = open => {
    $id('rolePackModal')?.classList.toggle('open', open);
    if (open) $id('rolePackClose')?.focus();
  };
  const syncConfirm = () => {
    const button = $id('rolePackApply');
    if (button) button.disabled = importing || !reviewedPlan || reviewedPlan.errors.length > 0 ||
      !$id('rolePackAcknowledge')?.checked;
  };
  const fetchContext = async () => {
    const projectId = state.projectFilter || '';
    const [existingAgents, rules, skills, mcps] = await Promise.all([
      api('/api/agents', {silent:true}),
      api('/api/rules', {silent:true}),
      api('/api/skills', {silent:true}),
      api('/api/mcp-servers', {silent:true}),
    ]);
    return {
      projectId, existingAgents, rules, skills,
      mcpServers: typeof visibleMCPAssets === 'function' ? visibleMCPAssets(mcps) : mcps,
      executors: state.data?.executors || [],
    };
  };
  const preview = plan => {
    listInto('rolePackPreview', plan.ready.map(role => role.name + ' (' + role.id + ')'));
    listInto('rolePackProblems', plan.errors);
    listInto('rolePackWarnings', plan.warnings);
    const errors = plan.errors.length;
    status(errors
      ? tr('发现 '+errors+' 个错误，未导入任何内容。',errors+' problem(s). Nothing has been imported.', 'Có '+errors+' lỗi; chưa nhập dữ liệu nào.')
      : tr('已校验 '+plan.ready.length+' 个角色。确认后将逐个创建，不修改已有角色。','Validated '+plan.ready.length+' roles. Confirm to create them without overwriting existing roles.','Đã kiểm tra '+plan.ready.length+' vai trò. Xác nhận để tạo từng vai trò, không ghi đè vai trò có sẵn.'));
    syncConfirm();
  };
  const loadFile = async file => {
    if (!file) return;
    if (!state.projectFilter) return toast(tr('请先选择项目','Select a project first','Hãy chọn dự án trước'), 'err', 3500);
    loadedPack = null;
    reviewedPlan = null;
    $id('rolePackAcknowledge').checked = false;
    modal(true);
    listInto('rolePackPreview', []);
    listInto('rolePackProblems', []);
    listInto('rolePackWarnings', []);
    status(tr('正在校验文件…','Validating file…','Đang kiểm tra tệp…'));
    syncConfirm();
    try {
      if (file.size > MAX_BYTES) fail('Role Pack file is too large (maximum 1 MiB)');
      loadedPack = parse(await file.text());
      reviewedPlan = preflight(loadedPack, await fetchContext());
      preview(reviewedPlan);
    } catch (error) {
      loadedPack = null;
      reviewedPlan = null;
      status(error.message || String(error));
      syncConfirm();
    }
  };
  const apply = async () => {
    if (importing || !loadedPack || !reviewedPlan || !reviewedPlan.ready.length || !($id('rolePackAcknowledge')?.checked)) return;
    importing = true;
    syncConfirm();
    status(tr('正在再次检查 ID 和权限…','Rechecking IDs and access…','Đang kiểm tra lại ID và quyền truy cập…'));
    try {
      const plan = preflight(loadedPack, await fetchContext()); // Recheck immediately before writing.
      reviewedPlan = plan;
      preview(plan);
      if (plan.errors.length) return;
      const result = await importRoles(plan, role => api('/api/agents', {method:'PUT', body:JSON.stringify(role)}));
      for (const agent of result.created) {
        const index = (state.data.agents || []).findIndex(item => item.id === agent.id);
        if (index >= 0) state.data.agents[index] = agent;
        else state.data.agents.push(agent);
      }
      state.agentScope = 'project';
      if (typeof renderAgents === 'function') renderAgents();
      if (typeof renderCanvas === 'function') renderCanvas();
      if (typeof renderWorkflowMeta === 'function') renderWorkflowMeta();
      if (result.failed) {
        const message = tr('已导入 '+result.created.length+' 个；在 '+result.failed.id+' 处停止。','Imported '+result.created.length+'; stopped at '+result.failed.id+'.','Đã nhập '+result.created.length+' vai trò; dừng tại '+result.failed.id+'.');
        status(message + ' ' + result.failed.message + ' ' + tr('操作不自动回滚。','Changes are not rolled back automatically.','Các vai trò đã tạo không tự động được hoàn tác.'));
        listInto('rolePackProblems', [result.failed.id + ': ' + result.failed.message]);
        reviewedPlan = null;
      } else {
        modal(false);
        loadedPack = null;
        reviewedPlan = null;
        toast(tr('角色包导入成功','Role Pack imported','Đã nhập Role Pack thành công'), 'ok');
      }
    } catch (error) {
      status(error.message || String(error));
    } finally {
      importing = false;
      syncConfirm();
    }
  };
  const download = (content, filename) => {
    const blob = new Blob([JSON.stringify(content, null, 2) + '\n'], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportCurrent = () => {
    const projectId = state.projectFilter || '';
    const roles = (state.data?.agents || []).filter(role => role.projectId === projectId);
    if (!projectId || !roles.length) return toast(tr('当前项目没有可导出的角色','No roles to export in this project','Dự án này chưa có vai trò để xuất'), 'warn');
    if (!window.confirm(tr(
      '导出的 JSON 包含角色提示词、验收命令与 Hook 脚本；分享前请检查敏感信息。继续？',
      'Export includes role prompts, validation commands and hook scripts. Check for secrets before sharing. Continue?',
      'Tệp xuất chứa prompt, lệnh nghiệm thu và script Hook. Hãy kiểm tra bí mật trước khi chia sẻ. Tiếp tục?'
    ))) return;
    try {
      download(exportPack(roles), 'loopforge-roles-' + projectId.replace(/[^a-z0-9_-]/gi, '_') + '.json');
    } catch (error) { toast(error.message || String(error), 'err'); }
  };
  const bind = () => {
    const pick = $id('rolePackPick');
    if (!pick) return;
    $id('rolePackImport')?.addEventListener('click', () => {
      if (!state.projectFilter) return toast(tr('请先选择项目','Select a project first','Hãy chọn dự án trước'), 'err');
      pick.value = '';
      pick.click();
    });
    pick.addEventListener('change', () => loadFile(pick.files?.[0]));
    $id('rolePackExport')?.addEventListener('click', exportCurrent);
    $id('rolePackClose')?.addEventListener('click', () => { if (!importing) modal(false); });
    $id('rolePackCancel')?.addEventListener('click', () => { if (!importing) modal(false); });
    $id('rolePackAcknowledge')?.addEventListener('change', syncConfirm);
    $id('rolePackApply')?.addEventListener('click', apply);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();
