import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../../web/app/'+name,import.meta.url),'utf8');
test('SkillHub empty state is Vietnamese and preserves raw search terms',()=>{
 const s=read('skillhub.js');
 assert.match(s,/Không tìm thấy kỹ năng phù hợp/);
 assert.match(s,/data-i18n-skip/);
 assert.match(s,/toLocaleString\(skillhubVI\(\)\?'vi-VN':'zh-CN'\)/);
 assert.match(s,/Danh mục này chưa có kỹ năng/);
});
test('SkillHub and shared task cards do not translate provider content or diagnostic errors',()=>{
 const s=read('skillhub.js'),t=read('shared-schedules.js');
 assert.match(s,/<h3 data-i18n-skip>/);
 assert.match(s,/asset-card-desc" data-i18n-skip/);
 assert.match(t,/shared-schedule-market-source" data-i18n-skip/);
 assert.match(t,/sharedScheduleCatalogError\)}<\/span>/);
});
