import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../../web/app/assets.js',import.meta.url),'utf8');
test('asset catalogue protects user names and descriptions',()=>{
 assert.match(s,/<h3 data-i18n-skip>\$\{escapeHTML\(name\)\}/);
 assert.match(s,/asset-card-desc"\$\{assetUserDataAttr\(a.description\)\}/);
 assert.match(s,/Từ dự án '\+assetProjectNameHTML\(a\)/);
 assert.match(s,/Không tìm thấy \$\{assetUILabel\(kind\)\}/);
});
test('asset metric units and references are composed in Vietnamese',()=>{
 assert.match(s,/\} tệp/);assert.match(s,/\} dòng/);assert.match(s,/lượt tham chiếu/);
});
