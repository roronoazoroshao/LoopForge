import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/app/observability.js',import.meta.url),'utf8');
test('Vietnamese observability chart labels preserve keys and counts',()=>{
 const state={analytics:{delivery:{issues:10,sopSucceeded:4,directWithMr:1,withMr:3,delivered:2,mrMerged:2}}};
 const c=vm.createContext({window:{lfLang:()=>'vi'},state});
 vm.runInContext(source,c);
 const stages=vm.runInContext('obsDeliveryStages()',c);
 assert.deepEqual(Array.from(stages,s=>s.name),['Yêu cầu có lượt chạy','LOOP thành công','Yêu cầu có PR','Yêu cầu có PR đã hợp nhất','Đã bàn giao']);
 assert.equal(stages[0].value,10);
 assert.equal(vm.runInContext("obsCategoryLabel('bugfix')",c),'Sửa lỗi');
});
