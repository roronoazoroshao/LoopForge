import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../../web/app/hui-upload.js',import.meta.url),'utf8');
function mount(lang){
 class El{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.textContent='';this.style={};this.classList={add(){},remove(){},toggle(){}}}setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]??null}appendChild(x){this.children.push(x)}replaceChildren(...a){this.children=a}addEventListener(){}closest(){return null}hasAttribute(k){return k in this.attributes}after(x){this.zone=x}}
 const doc={createElement:t=>new El(t),createElementNS:(_,t)=>new El(t),createTextNode:t=>({nodeType:3,textContent:t})},win={lfLang:()=>lang};
 vm.runInContext(src,vm.createContext({window:win,document:doc,MutationObserver:class{observe(){}}}));
 const input=new El('input');input.type='file';input.getAttribute=k=>k==='type'?'file':null;input.files=[{name:'中文名字.txt',size:10}];input.tabIndex=0;input.accept='.txt';input.isConnected=false;
 const api=win.HuiUpload.enhance(input);const get=klass=>input.zone.children.find(x=>x.className===klass);
 return {api,pick:get('hui-upload-line').children[1],files:get('hui-upload-files'),error:get('hui-upload-error')};
}
test('upload zone translates UI without editing Chinese filenames',()=>{
 const vi=mount('vi'),zh=mount('zh');
 assert.equal(vi.pick.textContent,'Chọn tệp');
 assert.equal(zh.pick.textContent,'选择文件');
 assert.equal(vi.files.children[0].children[1].textContent,'中文名字.txt');
 assert.equal(vi.files.children[0].children[1].attributes['data-i18n-skip'],'');
 vi.api.take([{name:'名字.exe',size:3,type:'application/octet-stream'}]);
 assert.equal(vi.error.textContent,'Loại tệp không được hỗ trợ: 名字.exe');
 zh.api.take([{name:'名字.exe',size:3,type:'application/octet-stream'}]);
 assert.match(zh.error.textContent,/^不支持的文件类型：/);
});
