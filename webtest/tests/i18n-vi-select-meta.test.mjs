import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

test('Vietnamese translates option metadata initially and after updates without altering values or search data', async t => {
  const dom = new JSDOM('<html data-lang="vi"><body><select><option value="project" data-search="项目 ID" data-meta="当前项目">本项目</option></select><div data-i18n-skip data-meta="当前项目"></div></body></html>', { runScripts: 'outside-only', url: 'http://127.0.0.1/' });
  t.after(() => dom.window.close());
  for (const file of ['i18n-en.js', 'i18n-vi.js', 'i18n.js']) {
    vm.runInContext(readFileSync(new URL('../../web/' + file, import.meta.url), 'utf8'), dom.getInternalVMContext(), { filename: file });
  }
  const doc = dom.window.document;
  const option = doc.querySelector('option');
  const settle = () => new Promise(resolve => dom.window.setTimeout(resolve, 0));
  await settle();
  assert.equal(option.dataset.meta, 'Dự án hiện tại');
  assert.equal(option.value, 'project');
  assert.equal(option.dataset.search, '项目 ID');
  assert.equal(doc.querySelector('[data-i18n-skip]').dataset.meta, '当前项目');
  option.dataset.meta = '仅自己可见';
  await settle();
  assert.equal(option.dataset.meta, 'Chỉ bạn nhìn thấy');
  const added = doc.createElement('option');
  added.value = 'personal';
  added.dataset.meta = '我';
  doc.querySelector('select').append(added);
  await settle();
  assert.equal(added.dataset.meta, 'Tôi');
  assert.equal(added.value, 'personal');
});
