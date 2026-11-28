import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, settle } from '../lib/load-app.mjs';

test('capability preflight displays untrusted text literally, not as HTML', async (t) => {
  const app = await loadApp();
  t.after(app.close);
  const payload = '<img src=x onerror="window.__capabilityXSS=true">';
  app.router.post(/^\/api\/capability-packs\/preflight\?/, {
    format: 'loopforge-capability-pack', schemaVersion: 1, projectId: 'project-1',
    items: [
      { kind: 'skills', id: 'safe-id', name: payload, description: payload,
        ready: true, preview: payload, filePaths: ['SKILL.md', 'references/' + payload], fileCount: 2 },
      { kind: 'skills', id: 'existing', name: 'Existing Skill', ready: false,
        reason: 'ID already exists; will not overwrite' },
    ],
    warnings: [payload],
  });
  app.evaluate(`state.projectFilter='project-1';state.assetType='skills';state.skillScope='project';state.selectedAsset=null;renderAssets()`);
  const importer = app.document.getElementById('capabilityPackImport');
  assert.ok(importer && !importer.hidden);
  const picker = app.document.getElementById('capabilityPackPick');
  assert.ok(picker);
  Object.defineProperty(picker, 'files', {
    configurable: true, value: [{ name: 'capabilities.zip', size: 1024 }],
  });
  picker.dispatchEvent(new app.window.Event('change', { bubbles: true }));
  await settle(5);
  const modal = app.document.getElementById('capabilityPackModal');
  assert.match(modal.textContent, /<img src=x onerror=/);
  assert.equal(modal.querySelector('img'), null, 'untrusted ZIP text must never become HTML elements');
  assert.equal(app.evaluate('window.__capabilityXSS === true'), false);
  assert.equal(modal.querySelectorAll('#capabilityPackItems input:disabled').length, 1);
  const details = modal.querySelector('#capabilityPackItems details');
  assert.match(details?.querySelector('pre')?.textContent || '', /<img/);
  assert.equal(modal.querySelector('script'), null);
});

test('capability pack import requires review and submits only checked nonduplicate IDs', async (t) => {
  const app = await loadApp({ locale: 'vi' });
  t.after(app.close);
  app.router.post(/^\/api\/capability-packs\/preflight\?/, {
    format: 'loopforge-capability-pack', schemaVersion: 1, projectId: 'project-1',
    items: [
      { kind: 'rules', id: 'rule-one', name: 'Rule One', ready: true, preview: '# Rule One' },
      { kind: 'skills', id: 'skill-two', name: 'Skill Two', ready: true, preview: '# Skill Two' },
      { kind: 'skills', id: 'existing', name: 'Existing', ready: false, reason: 'ID exists' },
    ], warnings: [],
  });
  app.router.post(/^\/api\/capability-packs\/import\?/, {
    created: ['rules/rule-one'], skipped: [], failed: [], warnings: [],
  });
  app.evaluate(`state.projectFilter='project-1';state.assetType='rules';state.ruleScope='project';state.selectedAsset=null;renderAssets()`);
  const picker = app.document.getElementById('capabilityPackPick');
  Object.defineProperty(picker, 'files', {
    configurable: true, value: [{ name: 'rules.zip', size: 1024 }],
  });
  picker.dispatchEvent(new app.window.Event('change', { bubbles: true }));
  await settle(5);
  const apply = app.document.getElementById('capabilityPackApply');
  assert.equal(apply.disabled, true, 'must review/acknowledge before import');
  const unchecked = app.document.querySelector('[data-capability="skills/skill-two"]');
  unchecked.checked = false;
  unchecked.dispatchEvent(new app.window.Event('change', { bubbles: true }));
  const consent = app.document.getElementById('capabilityPackConsent');
  consent.checked = true;
  consent.dispatchEvent(new app.window.Event('change', { bubbles: true }));
  assert.equal(apply.disabled, false);
  apply.click();
  await settle(5);
  const imports = app.router.calls.filter(call => call.path === '/api/capability-packs/import');
  assert.equal(imports.length, 1);
  const query = imports[0].url.searchParams;
  assert.equal(query.get('projectId'), 'project-1');
  assert.equal(query.get('confirm'), '1');
  assert.equal(query.get('selected'), 'rules/rule-one');
  assert.match(app.document.getElementById('capabilityPackStatus').textContent, /Đã tạo/);
});
