import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=name=>fs.readFileSync(new URL('../../web/app/'+name,import.meta.url),'utf8');
test('date picker shows Vietnamese weekdays without altering legacy Chinese mode',()=>{
 const s=source('hui-date.js'),start=s.indexOf('  const vi='),end=s.indexOf('  let serial =');
 for(const [lang,expected] of [['vi','T2,T3,T4,T5,T6,T7,CN'],['zh','一,二,三,四,五,六,日']]){
  const ctx=vm.createContext({window:{lfLang:()=>lang}});vm.runInContext(s.slice(start,end),ctx);
  assert.equal(vm.runInContext('WEEKDAYS.join(",")',ctx),expected);
 }
});
test('flow palette renders Vietnamese statuses and protects workflow names',()=>{
 const src=source('flow-palette.js');
 assert.match(src,/data-i18n-skip/);
 assert.match(src,/Đã sao chép tên LOOP/);
 const context=vm.createContext({window:{lfLang:()=> 'vi'}});
 vm.runInContext(src.slice(src.indexOf('  const paletteVI='),src.indexOf('  const ICONS=')),context);
 assert.equal(vm.runInContext("paletteCopy('已发布','Đã phát hành')",context),'Đã phát hành');
});
