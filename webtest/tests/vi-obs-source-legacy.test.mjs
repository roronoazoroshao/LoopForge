import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../../web/app/observability.js',import.meta.url),'utf8');
test('Gongfeng source names respect Chinese and Vietnamese preferences',()=>{
 for(const [lang,expected] of [['vi','Gongfeng'],['zh','工蜂']]){
  const c=vm.createContext({window:{lfLang:()=>lang}});
  vm.runInContext(src,c);
  assert.equal(vm.runInContext("obsSourceLabel('gongfeng')",c),expected);
 }
});
