import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../web/app/sync-schedule.js',import.meta.url),'utf8');
const part=source.slice(source.indexOf('function scheduleUICopy('),source.indexOf('function noteScheduleJobOutcomes('));
test('schedule outcome messages localize while preserving original server errors',()=>{
 const render=(lang,job)=>{const seen=[],ctx=vm.createContext({window:{lfLang:()=>lang},toast:(...v)=>seen.push(v),job});vm.runInContext(part+'\nscheduleJobOutcomeToast(job)',ctx);return seen[0]};
 assert.equal(render('vi',{lastStatus:'failed',lastError:'raw error'})[0],'Thất bại: raw error');
 assert.equal(render('vi',{lastStatus:'waiting',lastError:'项目·原始错误'})[0],'Đang chờ đồng bộ baseline: 项目·原始错误');
 assert.equal(render('vi',{lastStatus:'succeeded',lastPulled:12,lastDispatched:3})[0],'Hoàn tất: 12 ứng viên, đã khởi chạy 3');
 assert.equal(render('zh',{lastStatus:'succeeded',lastPulled:12,lastDispatched:3})[0],'完成：候选 12，启动 3');
});
