import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../../web/app/issues.js',import.meta.url),'utf8');
test('issue row source provides Vietnamese progress while preserving raw names',()=>{
 assert.match(s,/Nguồn yêu cầu:/);
 assert.match(s,/Bước kiểm tra hoặc script thất bại/);
 assert.match(s,/Cần xác nhận kết luận/);
 assert.match(s,/issue-assignee-cell"\$\{issuesVI\(\)/);
 assert.match(s,/issue-repository-cell"\$\{issuesVI\(\)/);
});
