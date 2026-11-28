import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../chatbot/src/QuickAccessWizard.jsx',import.meta.url),'utf8');
const extractor=source.slice(source.indexOf('export function sharedModelNames('),source.indexOf('const STEPS = [')).replace('export function','function');
test('QuickAccess wizard lists CLI/model names with locale punctuation',()=>{
 const names=lang=>{const c=vm.createContext({chatT:(zh,vi)=>lang==='vi'?vi:zh});return vm.runInContext("const quickAccessListSeparator=()=>chatT('、', ', ');\n"+extractor+"\nsharedModelNames(['deepseek-v4.1-flash','Codex'])",c)};
 assert.equal(names('vi'),'Deepseek-V4.1-Flash, Codex');
 assert.equal(names('zh'),'Deepseek-V4.1-Flash、Codex');
});
test('onboarding choices do not append Chinese closing parentheses in Vietnamese',()=>{
 assert.match(source,/code>\{parsedRepo\.name\}<\/code>\{chatT\("）", "\)"\)\}/);
 assert.equal((source.match(/\.join\(quickAccessListSeparator\(\)\)/g)||[]).length,5);
});
