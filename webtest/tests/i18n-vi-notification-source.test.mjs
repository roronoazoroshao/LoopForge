import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../web/app/notification-editor.js',import.meta.url),'utf8');
function fixture(lang){const c=vm.createContext({window:{lfLang:()=>lang}});vm.runInContext(source,c);return c;}
const vars=value=>[...value.matchAll(/\{\{[^}]+\}\}/g)].map(m=>m[0]);
test('notification presets preserve variables and choose Vietnamese at the source',()=>{
 const vi=fixture('vi'),zh=fixture('zh');
 for(const expr of ["notificationRecommendedSOPTemplate()","notificationPresetTemplate('run','complete')","notificationPresetTemplate('run','progress')","notificationPresetTemplate('task','complete')","notificationPresetTemplate('task','progress')"]){
  const a=vm.runInContext(expr,vi),b=vm.runInContext(expr,zh);assert.deepEqual(vars(a),vars(b),expr);assert.doesNotMatch(a,/\p{Script=Han}/u,expr);
 }
 assert.match(vm.runInContext('notificationDefaultInstruction()',vi),/Không đưa thông tin xác thực/);
});
