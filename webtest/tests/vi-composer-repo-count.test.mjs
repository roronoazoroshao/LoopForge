import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../../web/app/composer.js',import.meta.url),'utf8');
test('composer locales protect repository/branch and keep counts',()=>{
 assert.match(s,/<b data-i18n-skip>\$\{escapeHTML\(reqRepoNames/);
 assert.match(s,/<span data-i18n-skip>\$\{escapeHTML\(branch\)\}/);
 assert.match(s,/kho mã khác/);
 assert.match(s,/ký tự/);
});
