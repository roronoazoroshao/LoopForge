import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=path=>fs.readFileSync(new URL('../../web/app/'+path,import.meta.url),'utf8');
test('Runner concurrency labels use Vietnamese and preserve limits',()=>{
 const s=source('runners.js'),part=s.slice(s.indexOf('function runnerUICopy('),s.indexOf('function runnerRunLimitHTML('));
 const c=vm.createContext({window:{lfLang:()=>'vi'}});
 vm.runInContext(part,c);
 assert.equal(vm.runInContext('runnerConcurrencyLabel({ownerUserId:3,runLimit:7})',c),'Máy cá nhân · chạy đồng thời tối đa 7 SOP (không chịu giới hạn 10 SOP của dự án)');
 assert.equal(vm.runInContext('runnerConcurrencyLabel({ownerUserId:0})',c),'Máy thực thi dùng chung của dự án');
});
test('SOP KPI quantities localize before DOM, without touching metric values',()=>{
 const s=source('sops.js'),part=s.slice(s.indexOf('function sopVI('),s.indexOf('function sopRunCardBody('));
 const c=vm.createContext({window:{lfLang:()=>'vi'}});
 vm.runInContext(part,c);
 const html=vm.runInContext('sopRunKpis({totalRuns:12,succeededRuns:7,failedRuns:3},2)',c);
 assert.match(html,/12<\/b>lượt chạy/);assert.match(html,/7<\/b>thành công/);assert.match(html,/3<\/b>thất bại/);
});
