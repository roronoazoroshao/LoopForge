import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../../chatbot/src/SidebarPreview.jsx',import.meta.url),'utf8');
const helper=src.split('\n').find(s=>s.startsWith('const sidebarSectionAriaLabel ='));
test('sidebar accessibility label localizes without modifying project names',()=>{
 const label=(lang,title)=>vm.runInContext(helper+'\nsidebarSectionAriaLabel('+JSON.stringify(title)+')',vm.createContext({chatT:(zh,vi)=>lang==='vi'?vi:zh}));
 assert.equal(label('vi','项目 A'),'Hội thoại của 项目 A');
 assert.equal(label('zh','项目 A'),'项目 A的会话');
 assert.match(src,/aria-label=\{sidebarSectionAriaLabel\(title\)\}/);
});
