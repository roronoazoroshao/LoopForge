import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const get=lang=>{const w={},c=vm.createContext({window:w});vm.runInContext(readFileSync(new URL('../../web/i18n-'+lang+'.js',import.meta.url),'utf8'),c);return w[lang==='vi'?'LF_I18N_VI':'LF_I18N_EN'];};
test('project, schedule, account and TAPD errors have exact Vietnamese copy',()=>{
 const dict=get('vi');
 for(const [source,want] of Object.entries({
  '项目不存在或已删除':'Không tìm thấy dự án hoặc dự án đã bị xóa.',
  'TAPD 同步未配置':'Chưa cấu hình đồng bộ TAPD.',
  'AI 定时任务必须填写提示词':'Tác vụ AI theo lịch phải có prompt.',
  '没有该项目的定时任务访问权限':'Bạn không có quyền truy cập tác vụ theo lịch của dự án này.',
  'syncTarget 只能是 local、gongfeng 或 tapd':'syncTarget chỉ được là local, gongfeng hoặc tapd.',
 })){assert.equal(dict[source],want)}
 assert.equal(Object.keys(dict).length,Object.keys(get('en')).length);
});
