import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/workbench.js',import.meta.url),'utf8');
function outputs(lang){
 const win={lfLang:()=>lang};
 const patched=source.replace('  window.LoopForgeWorkbench = { mount };','  window.__workbenchTest={renderMessage,scrubPaths};\n  window.LoopForgeWorkbench = { mount };');
 vm.runInContext(patched,vm.createContext({window:win,localStorage:{getItem:()=>null}}));
 const user=win.__workbenchTest.renderMessage({kind:'message',author:'u:0',body:'Raw 中文 原始',at:'2026-11-22T09:35:00Z',attachments:[{name:'我的文件.txt',id:'a',mimeType:'text/plain'}]});
 const ai=win.__workbenchTest.renderMessage({kind:'ai',author:'ai',body:'Generated 代码 and 文档',aiStatus:'succeeded',at:'2026-11-22T09:35:00Z'});
 return {user,ai,path:win.__workbenchTest.scrubPaths('See /tmp/secret.txt for output')};
}
test('Workbench protects user messages, filenames and AI output from DOM translation',()=>{
 const vi=outputs('vi');
 assert.match(vi.user,/<div data-i18n-skip>Raw 中文 原始<\/div>/);
 assert.match(vi.user,/data-i18n-skip>我的文件\.txt/);
 assert.match(vi.ai,/class="msg-body" data-i18n-skip>Generated 代码/);
 assert.match(vi.path,/Không thể mở đường dẫn đám mây/);
 assert.doesNotMatch(vi.path,/\/tmp\/secret.txt/);
 const zh=outputs('zh');
 assert.match(zh.path,/云端路径打不开/);
 assert.match(outputs('en').user,/>You<\/span>/);
});
