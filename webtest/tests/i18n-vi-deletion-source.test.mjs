import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/app/issue-model.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function issueDeletionWarning('),source.indexOf('function issueDeletionContextHTML('));
test('Vietnamese deletion warning preserves irreversible, force and external synchronization semantics',()=>{
 const context=vm.createContext({window:{lfLang:()=> 'vi'}});
 vm.runInContext(code,context);
 for(const force of [false,true])for(const external of [false,true]){
  const message=vm.runInContext('issueDeletionWarning('+force+','+external+')',context);
  assert.match(message,/Không thể khôi phục/);
  assert.equal(message.includes('cũng sẽ bị dọn sạch'),force);
  assert.equal(message.includes('đồng bộ sau này có thể nhập lại'),external);
  assert.doesNotMatch(message,/\p{Script=Han}/u);
 }
});
