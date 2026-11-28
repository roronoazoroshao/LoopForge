import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chatLocale} from '../../chatbot/src/locale.js';

test('chat locale tracks platform language preference', ()=>{
  const original = globalThis.localStorage;
  try {
    let stored='vi';
    globalThis.localStorage={getItem:key=>key==='loopforge.lang'?stored:null};
    assert.equal(chatLocale(),'vi');
    stored='en';
    assert.equal(chatLocale(),'en');
    stored='zh';
    assert.equal(chatLocale(),'zh');
    stored='unknown';
    assert.equal(chatLocale(),'zh');
  } finally {
    if (original===undefined) delete globalThis.localStorage;
    else globalThis.localStorage=original;
  }
});

test('all chat generation entry points send response language without changing user messages', ()=>{
  const paths=['useChat.js','SopDesigner.jsx'];
  for(const name of paths){
    const code=readFileSync(new URL('../../chatbot/src/'+name,import.meta.url),'utf8');
    const uses=[...code.matchAll(/write\("\/api\/assistant\/generations",\s*\{/g)].length;
    const locale=[...code.matchAll(/responseLanguage:\s*chatLocale\(\)/g)].length;
    assert.ok(uses>0, name+' must invoke generation endpoint');
    assert.equal(locale,uses,name+' must pass locale on every generation call');
  }
});
