import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../web/app/assistant-models.js', import.meta.url), 'utf8');

function setup() {
  const pending = [];
  const window = {};
  vm.runInNewContext(source, { window, fetch: path => new Promise(resolve => pending.push({ path, resolve })) });
  const response = id => ({ ok: true, json: async () => ({ models: [{ id }] }) });
  return { models: window.AgentFlowAssistantModels, pending, response };
}

test('a delayed old catalog cannot replace the latest credential refresh', async () => {
  const { models, pending, response } = setup();
  const old = models.load();
  const fresh = models.load({ refresh: true });
  assert.equal(pending[1].path, '/api/assistant/models?refresh=1');
  pending[1].resolve(response('codex:gpt-new'));
  await fresh;
  pending[0].resolve(response('codex:gpt-old'));
  await old;
  assert.equal(models.catalog().models[0].id, 'codex:gpt-new');
});

test('completion of a superseded request does not clear the current in-flight request', async () => {
  const { models, pending, response } = setup();
  const old = models.load();
  const fresh = models.load({ refresh: true });
  pending[0].resolve(response('codex:gpt-old'));
  await old;
  assert.equal(models.load(), fresh);
  assert.equal(pending.length, 2);
  pending[1].resolve(response('codex:gpt-new'));
  await fresh;
  assert.equal(models.catalog().models[0].id, 'codex:gpt-new');
});
