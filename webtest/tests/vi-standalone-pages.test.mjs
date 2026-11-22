import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../../web/'+path,import.meta.url),'utf8');
test('standalone routes load language preference and translation before page scripts',()=>{
 for(const [path,entry] of [['vscode.html','/vscode.js'],['bot-bind.html','/bot-bind.js'],['gongfeng-oauth-done.html','/gongfeng-oauth-done.js']]){
  const html=read(path);
  const scripts=['/boot.js','/i18n-en.js','/i18n-vi.js','/i18n.js',entry];
  let prior=-1;
  for(const src of scripts){const i=html.indexOf('src="'+src);assert.ok(i>prior,path+' '+src);prior=i}
 }
 assert.match(read('bot-bind.js'),/id="account" data-i18n-skip/);
 assert.match(read('bot-bind.js'),/<strong data-i18n-skip>/);
});
