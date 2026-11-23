// Real Chromium coverage: API-backed template roles, the Harness dropdown,
// the canvas and a saved project clone. The E2E project is disposable.
import { test, expect, watchErrors } from './fixtures.mjs';
import { get, post, del, track, cleanup } from '../lib/api.mjs';
import { createAgent } from '../lib/fixtures.mjs';
import { cfg, uid } from '../lib/env.mjs';

const templateId = 'generic-backend-delivery';
const stages = [
  ['clarify', '需求定型', 'Requirement scoping', 'Chốt yêu cầu'],
  ['design', '方案设计', 'Solution design', 'Thiết kế giải pháp'],
  ['implement', '开发实现', 'Implementation', 'Triển khai'],
  ['review', '独立评审', 'Independent review', 'Rà soát độc lập'],
  ['test', '测试验证', 'Testing and verification', 'Kiểm thử và xác minh'],
  ['deliver', '交付汇总', 'Delivery summary', 'Tổng hợp bàn giao'],
  ['mr', '发起 MR', 'Create Merge Request', 'Tạo Merge Request'],
];

test.afterAll(cleanup);

async function language(page, lang) {
  const button = page.locator('#langToggle [data-lang-value="' + lang + '"]');
  if (await button.getAttribute('aria-checked') === 'true') return;
  await Promise.all([page.waitForEvent('load'), button.click()]);
  await expect(button).toHaveAttribute('aria-checked', 'true');
}

async function canvasLabels(page, index) {
  for (const [id, , ...translations] of stages) {
    const display = [stages.find(s => s[0] === id)[1], ...translations][index];
    await expect(page.locator('#nodes .flow-node[data-id="' + id + '"] .node-title')).toHaveText(display);
    await expect(page.locator('#nodes .flow-node[data-id="' + id + '"] .node-subtitle')).toHaveText(display);
  }
}

test('SOP template: VI → EN → ZH → VI keeps the canvas, role dropdown and drawer localized', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/flow/' + templateId);
  await expect(page.locator('#nodes .flow-node')).toHaveCount(8);
  for (const [lang, index] of [['vi', 3], ['en', 2], ['zh', 1], ['vi', 3]]) {
    await language(page, lang);
    await expect(page.locator('#nodes .flow-node')).toHaveCount(8);
    await canvasLabels(page, index);
    await page.locator('#nodes .flow-node[data-id="clarify"]').click();
    const select = page.locator('#properties select[data-p="agentId"]');
    const roleLabel = { vi: 'Vai trò cho bước này', en: 'Role for this step',
      zh: '这个步骤用哪个角色' }[lang];
    await expect(select).toHaveAttribute('aria-label', roleLabel);
    for (const [stageId, , ...translations] of stages) {
      const display = [stages.find(s => s[0] === stageId)[1], ...translations][index];
      await expect(select.locator('option[value="' + templateId + '-' + stageId + '"]')).toHaveText(display);
      await expect(page.locator('#flowPaletteRoles [data-agent-id="' + templateId + '-' + stageId + '"] b')).toHaveText(display);
    }
    await expect(page.locator('#properties .fd-role-t b')).toHaveText(stages[0][index]);
    await expect(page.locator('#properties .fd-dh-name')).toHaveValue(stages[0][index]);
    await select.click();
    const dropdown = page.locator('.hui-select-panel.is-open');
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toHaveAttribute('aria-label', roleLabel);
    await expect(dropdown.getByRole('option', { name: stages[1][index] })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('sop-template-' + lang + '.png') });
    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('SOP project copy: user-defined Chinese role survives save and reload with unchanged source labels', async ({ page }) => {
  const errors = watchErrors(page);
  const customName = '自定义角色 · Dữ liệu của người dùng';
  const customId = await createAgent('sop-locale-custom', 'Do not translate names', { name: customName });
  const id = uid('sop-locale-clone');
  const copied = await post('/api/workflows/' + templateId + '/clone', {
    id, name: 'E2E SOP bản sao', projectId: cfg.projectId, sandboxProfileId: cfg.sandbox,
  });
  track('workflow ' + id, () => del('/api/workflows/' + id));
  expect(copied.nodes.find(n => n.id === 'clarify').name).toBe('需求定型');
  await page.goto('/#/flow/' + id);
  await language(page, 'vi');
  await page.locator('#nodes .flow-node[data-id="clarify"]').click();
  const select = page.locator('#properties select[data-p="agentId"]');
  await expect(select).toHaveAttribute('aria-label', 'Vai trò cho bước này');
  await select.click();
  const dropdown = page.locator('.hui-select-panel.is-open');
  await expect(dropdown.getByRole('option', { name: customName })).toBeVisible();
  await dropdown.getByRole('option', { name: customName }).click();
  await expect(select).toHaveValue(customId);
  await page.locator('#saveWorkflow').click();
  await expect.poll(async () => (await get('/api/workflows/' + id)).nodes.find(n => n.id === 'clarify').agentId).toBe(customId);
  const saved = await get('/api/workflows/' + id);
  expect(saved.nodes.find(n => n.id === 'clarify').name).toBe('需求定型');
  await page.reload();
  await expect(page.locator('#nodes .flow-node[data-id="clarify"] .node-title')).toHaveText('Chốt yêu cầu');
  await expect(page.locator('#nodes .flow-node[data-id="clarify"] .node-subtitle')).toHaveText(customName);
  await page.locator('#nodes .flow-node[data-id="clarify"]').click();
  await expect(page.locator('#properties .fd-role-t b')).toHaveText(customName);
  await expect(page.locator('#properties select[data-p="agentId"]')).toHaveValue(customId);
  await page.screenshot({ path: test.info().outputPath('sop-clone-vi-after-reload.png') });
  expect(errors).toEqual([]);
});
