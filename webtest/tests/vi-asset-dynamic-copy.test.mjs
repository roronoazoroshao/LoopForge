import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../../web/app/assets.js',import.meta.url),'utf8');
test('asset catalogue protects user names and descriptions',()=>{
 assert.match(s,/<h3 data-i18n-skip>\$\{escapeHTML\(assetDisplayName\(a\)\)\}/);
 assert.match(s,/asset-card-desc" data-i18n-skip/);
 assert.match(s,/Từ dự án \$\{escapeHTML\(assetProjectName\(a\)\)\}/);
 assert.match(s,/Không tìm thấy \$\{escapeHTML\(assetUILabel\(kind\)\)\}/);
});
test('asset metric units and references are composed in Vietnamese',()=>{
 assert.match(s,/\} tệp/);assert.match(s,/ biến/);assert.match(s,/lượt tham chiếu/);
});
