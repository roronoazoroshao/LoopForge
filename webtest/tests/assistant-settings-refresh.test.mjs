import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../web/app/workbench.js', import.meta.url), 'utf8');
const start = source.indexOf('function notifyCredentialsChanged()');
const end = source.indexOf('async function saveCredential', start);
const notify = source.slice(start, end);

for (const [dirty, saving, expected] of [[true, false, 0], [false, true, 0], [false, false, 1]]) {
  test(`credential refresh preserves pending settings (dirty=${dirty}, saving=${saving})`, async () => {
    let renders = 0;
    const form = {};
    const context = {
      window: { AgentFlowAssistantModels: { load: () => Promise.resolve() } },
      document: { querySelector: () => ({}) },
      $: () => null,
      location: { origin: 'https://example.invalid' },
      renderAssistantSettings: () => renders++,
      assistantPrefsForm: () => form,
      assistantPrefsDirty: () => dirty,
      assistantPrefsUI: { saving }
    };
    vm.runInNewContext(notify + '\nnotifyCredentialsChanged();', context);
    await Promise.resolve();
    assert.equal(renders, expected);
  });
}
