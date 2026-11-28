import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../../web/app/platform-ssh-hosts.js',import.meta.url),'utf8');
test('SSH removal confirmation is Vietnamese while preserving raw hostnames',()=>{
 for(const [lang,prefix] of [['vi','Gỡ đăng ký máy chủ SSH'],['zh','移除'],['en','Remove the registration for']]){
  const win={lfLang:()=>lang},ctx=vm.createContext({window:win,lfT:(zh,en)=>lang==='en'?en:zh});
  vm.runInContext(src,ctx);
  const name='研发 项目 · git.example.org';
  const result=vm.runInContext('platformSSHHostRemovalMessage('+JSON.stringify(name)+')',ctx);
  assert.ok(result.startsWith(prefix));
  assert.ok(result.includes(name));
 }
 assert.match(src,/messageLocalized:window\.lfLang\?\.\(\)==='vi'/);
});
