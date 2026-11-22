import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../../web/'+p,import.meta.url),'utf8');
function translate(locale,key){
 const window={confirm(){},alert(){},prompt(){}};
 const document={documentElement:{dataset:{lang:locale},classList:{contains:()=>false}},readyState:'loading',addEventListener(){}};
 const context=vm.createContext({window,document,MutationObserver:class {}});
 for(const file of ['i18n-en.js','i18n-vi.js','i18n.js'])vm.runInContext(read(file),context);
 return window.lfTranslate(key);
}
test('Vietnamese static canvas tooltips and long descriptions translate completely',()=>{
 const cases={
  '缩小':'Thu nhỏ','小地图':'Bản đồ thu nhỏ',
  '适应视图':'Vừa khung nhìn','重置为 100%':'Đặt lại về 100%',
  '运行沙箱 · 点击修改':'Sandbox thực thi · Nhấn để thay đổi',
  '放弃修改，恢复到上次保存':'Hủy thay đổi và khôi phục phiên bản đã lưu gần nhất'
 };
 for(const [zh,vi] of Object.entries(cases))assert.equal(translate('vi',zh),vi,zh);
 const hint='用 {{params.days}} 引用下方参数，例如“检查超过 {{params.days}} 天未更新的需求”。发布内容对平台登录用户可见。';
 assert.match(translate('vi',hint),/Dùng \{\{params.days\}\}/);
 assert.equal((translate('vi',hint).match(/\{\{params.days\}\}/g)||[]).length,2);
});
