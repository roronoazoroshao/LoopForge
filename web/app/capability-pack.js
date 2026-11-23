// Safe project-scoped Rules/Skills ZIP portability. Never execute archive content.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MAX_UPLOAD = 65 * 1024 * 1024;
  const tr = (zh, en, vi) => {
    const lang = typeof window.lfLang === 'function' ? window.lfLang() : 'zh';
    return lang === 'vi' ? vi : lang === 'en' ? en : zh;
  };
  const labels = {
    import: ['导入能力包', 'Import Capability Pack', 'Nhập gói năng lực'],
    export: ['导出能力包', 'Export Capability Pack', 'Xuất gói năng lực'],
    title: ['导入 Rules / Skills', 'Import Rules / Skills', 'Nhập Rules / Skills'],
    help: ['检查 ZIP 内容与权限；此操作不会执行脚本或覆盖已有数据。', 'Review archive content and permissions. Nothing executes or overwrites existing resources.', 'Kiểm tra nội dung và quyền truy cập. Việc nhập không chạy script hoặc ghi đè tài nguyên.'],
    preview: ['待导入的资源', 'Resources to import', 'Tài nguyên có thể nhập'],
    warnings: ['安全警告', 'Security warnings', 'Cảnh báo bảo mật'],
    consent: ['我已检查脚本、来源及访问权限。', 'I have reviewed the scripts, sources and access risks.', 'Tôi đã kiểm tra script, nguồn gốc và rủi ro truy cập.'],
    apply: ['确认导入', 'Import selected', 'Nhập tài nguyên đã chọn'],
    close: ['关闭', 'Close', 'Đóng'],
  };
  const t = k => tr(...labels[k]);
  const core = {
    // Render user-controlled filenames and names with textContent only.
    selected(items) {
      return items.filter(item => item.ready && item.checked).map(item => item.kind + '/' + item.id);
    },
    formatResult(result) {
      return tr(
        '已创建 '+(result.created||[]).length+' 项；跳过 '+(result.skipped||[]).length+' 项；失败 '+(result.failed||[]).length+' 项。',
        'Created '+(result.created||[]).length+', skipped '+(result.skipped||[]).length+', failed '+(result.failed||[]).length+'.',
        'Đã tạo '+(result.created||[]).length+', bỏ qua '+(result.skipped||[]).length+', lỗi '+(result.failed||[]).length+'.'
      );
    },
  };
  window.LoopForgeCapabilityPack = core;
  let file = null, plan = null, busy = false;
  function status(message) {
    if ($('capabilityPackStatus')) $('capabilityPackStatus').textContent = message;
  }
  function appendTextList(host, lines) {
    host.replaceChildren();
    for (const value of lines) {
      const li = document.createElement('li');
      li.textContent = String(value);
      host.append(li);
    }
  }
  function show(open) {
    $('capabilityPackModal')?.classList.toggle('open', open);
    if (open) $('capabilityPackClose')?.focus();
  }
  function sync() {
    const can = !busy && !!file && !!plan &&
      !!$('capabilityPackConsent')?.checked &&
      core.selected(plan.items.map(item => ({...item, checked: !!document.querySelector(
        '#capabilityPackItems input[data-capability="' + item.kind + '/' + item.id + '"]')?.checked
      }))).length;
    if ($('capabilityPackApply')) $('capabilityPackApply').disabled = !can;
    for (const id of ['capabilityPackImport', 'capabilityPackExport']) {
      if ($(id)) $(id).disabled = busy;
    }
  }
  function displayPlan(data) {
    const host = $('capabilityPackItems');
    host.replaceChildren();
    for (const item of data.items || []) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.capability = item.kind + '/' + item.id;
      box.checked = !!item.ready;
      box.disabled = !item.ready;
      box.addEventListener('change', sync);
      label.append(box);
      const caption = document.createElement('span');
      caption.textContent = ' ' + item.name + ' (' + item.kind + '/' + item.id + ')' +
        (item.reason ? ' — ' + item.reason : '');
      label.append(caption);
      li.append(label);
      host.append(li);
    }
    appendTextList($('capabilityPackWarnings'), data.warnings || []);
    $('capabilityPackConsent').checked = false;
    sync();
  }
  async function apiZIP(path, input) {
    const response = await fetch(path, {
      method: 'POST',
      body: input,
      headers: {'Content-Type': 'application/zip'},
      credentials: 'same-origin',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'HTTP ' + response.status);
    return data;
  }
  function project() {
    const id = (typeof state === 'object' && state.projectFilter) || '';
    if (!id) throw new Error(tr('请先选择项目', 'Select a project first', 'Hãy chọn dự án trước'));
    return id;
  }
  async function chooseFile(picked) {
    if (!picked || busy) return;
    file = null;
    plan = null;
    show(true);
    $('capabilityPackItems').replaceChildren();
    appendTextList($('capabilityPackWarnings'), []);
    status(tr('正在检查 ZIP…', 'Inspecting ZIP…', 'Đang kiểm tra ZIP…'));
    if (picked.size > MAX_UPLOAD) {status(tr('ZIP 超过 65 MiB', 'ZIP exceeds 65 MiB', 'ZIP vượt quá 65 MiB'));sync();return;}
    busy = true; sync();
    try {
      const id = project();
      const data = await apiZIP('/api/capability-packs/preflight?projectId=' + encodeURIComponent(id), picked);
      file = picked;
      plan = data;
      displayPlan(data);
      status(tr('检查完成；请选择要导入的资源。', 'Review complete; select resources to import.', 'Đã kiểm tra; hãy chọn tài nguyên cần nhập.'));
    } catch (error) {status(error.message || String(error));}
    finally {busy = false;sync();}
  }
  async function apply() {
    if (busy || !plan || !file || !$('capabilityPackConsent').checked) return;
    const selected = core.selected(plan.items.map(item => ({
      ...item, checked: !!document.querySelector(
        '#capabilityPackItems input[data-capability="' + item.kind + '/' + item.id + '"]')?.checked,
    })));
    if (!selected.length) return;
    busy = true;sync();
    status(tr('正在导入…', 'Importing…', 'Đang nhập…'));
    try {
      const id = project();
      const url = '/api/capability-packs/import?projectId=' + encodeURIComponent(id) +
        '&confirm=1&selected=' + encodeURIComponent(selected.join(','));
      const result = await apiZIP(url, file);
      const failures = [...(result.failed || []), ...(result.skipped || [])];
      appendTextList($('capabilityPackWarnings'), [...(result.warnings || []), ...failures]);
      status(core.formatResult(result));
      const [rules, skills] = await Promise.all([
        api('/api/rules', {silent:true}), api('/api/skills', {silent:true}),
      ]);
      state.data.rules = rules;
      state.data.skills = skills;
      if (typeof renderAssets === 'function') renderAssets();
      file = null; plan = null; $('capabilityPackConsent').checked = false;
    } catch (error) {status(error.message || String(error));}
    finally {busy = false;sync();}
  }
  async function exportPack() {
    if (busy) return;
    let id;
    try {id = project();} catch (error) {status(error.message);show(true);return;}
    if (!window.confirm(tr(
      '导出内容可能包含密钥或敏感代码。分享前请检查。继续？',
      'Exported files may contain secrets or sensitive code. Review before sharing. Continue?',
      'Tệp xuất có thể chứa secrets hoặc mã nhạy cảm. Hãy rà soát trước khi chia sẻ. Tiếp tục?'
    ))) return;
    busy = true;sync();
    const kind = state.assetType;
    try {
      const response = await fetch('/api/capability-packs/export?projectId=' +
        encodeURIComponent(id) + '&kind=' + encodeURIComponent(kind), {credentials:'same-origin'});
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem?.error || 'HTTP ' + response.status);
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'loopforge-' + kind + '-' + id.replace(/[^a-zA-Z0-9_-]/g,'_') + '.zip';
      a.click();
      URL.revokeObjectURL(href);
    } catch (error) {show(true);status(error.message || String(error));}
    finally {busy = false;sync();}
  }
  window.capabilityPackSyncChrome = () => {
    const on = (state.assetType === 'rules' || state.assetType === 'skills') &&
      !state.selectedAsset && state[state.assetType === 'rules' ? 'ruleScope' : 'skillScope'] === 'project';
    if ($('capabilityPackImport')) $('capabilityPackImport').hidden = !on;
    if ($('capabilityPackExport')) $('capabilityPackExport').hidden = !on;
  };
  function bind() {
    const heading = document.querySelector('#assetsView .asset-heading .heading-actions');
    if (!heading || $('capabilityPackImport')) return;
    const importButton = document.createElement('button');
    importButton.id = 'capabilityPackImport';
    importButton.type = 'button';
    importButton.className = 'button ghost';
    importButton.textContent = t('import');
    const exportButton = document.createElement('button');
    exportButton.id = 'capabilityPackExport';
    exportButton.type = 'button';
    exportButton.className = 'button ghost';
    exportButton.textContent = t('export');
    heading.prepend(exportButton);
    heading.prepend(importButton);
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.id = 'capabilityPackPick';
    picker.accept = '.zip,application/zip';
    picker.hidden = true;
    heading.append(picker);
    const modal = document.createElement('div');
    modal.id = 'capabilityPackModal';
    modal.className = 'modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','capabilityPackTitle');
    modal.innerHTML = `<div class="modal-card role-pack-card">
      <div class="role-pack-head"><div><h2 id="capabilityPackTitle"></h2>
      <p id="capabilityPackHelp"></p></div>
      <button id="capabilityPackClose" type="button" class="modal-close" aria-label="Close">×</button></div>
      <div class="role-pack-content">
        <p id="capabilityPackStatus" role="status" aria-live="polite"></p>
        <h3 id="capabilityPackPreviewTitle"></h3>
        <ul id="capabilityPackItems" class="role-pack-list"></ul>
        <h3 id="capabilityPackWarningsTitle"></h3>
        <ul id="capabilityPackWarnings" class="role-pack-list role-pack-errors"></ul>
        <label class="role-pack-acknowledge"><input id="capabilityPackConsent" type="checkbox">
        <span id="capabilityPackConsentLabel"></span></label>
      </div>
      <div class="role-pack-footer"><button id="capabilityPackCancel" type="button" class="button ghost"></button>
      <button id="capabilityPackApply" type="button" class="button primary" disabled></button></div>
    </div>`;
    document.body.append(modal);
    $('capabilityPackTitle').textContent = t('title');
    $('capabilityPackHelp').textContent = t('help');
    $('capabilityPackPreviewTitle').textContent = t('preview');
    $('capabilityPackWarningsTitle').textContent = t('warnings');
    $('capabilityPackConsentLabel').textContent = t('consent');
    $('capabilityPackCancel').textContent = t('close');
    $('capabilityPackApply').textContent = t('apply');
    importButton.addEventListener('click', () => {
      try {project();}catch(error){status(error.message);show(true);return;}
      picker.value = ''; picker.click();
    });
    exportButton.addEventListener('click', exportPack);
    picker.addEventListener('change', () => chooseFile(picker.files?.[0]));
    $('capabilityPackApply').addEventListener('click', apply);
    $('capabilityPackConsent').addEventListener('change', sync);
    for (const id of ['capabilityPackClose','capabilityPackCancel']) {
      $(id).addEventListener('click', () => {if (!busy) show(false);});
    }
    window.capabilityPackSyncChrome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();