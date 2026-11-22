import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/app/dashboards.js',import.meta.url),'utf8');
function metric(lang,expr){const c=vm.createContext({window:{lfLang:()=>lang}});vm.runInContext(source,c);return vm.runInContext(expr,c);}
test('dashboard dynamic hints localize without changing health state',()=>{
 assert.equal(metric('vi','metricHealth({},3).hint'),'3 lượt đang thực thi');
 assert.equal(metric('vi','metricHealth({totalRuns:1,waitingRuns:2}).hint'),'2 lượt đang chờ phê duyệt');
 assert.equal(metric('vi','metricHealth({totalRuns:1,succeededRuns:1,closureRate:90}).hint'),'Tỷ lệ hoàn thành khép kín 90%');
 assert.equal(metric('zh','metricHealth({},3).hint'),'3 个实例执行中');
});
