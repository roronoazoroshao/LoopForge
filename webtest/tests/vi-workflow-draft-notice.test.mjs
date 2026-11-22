import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../../web/app/flows.js',import.meta.url),'utf8');
const impl=src.slice(src.indexOf('function workflowDraftCreatedNotice('),src.indexOf('function newWorkflow('));
test('SOP creation notice localizes dynamic dependency count while preserving raw names',()=>{
 const vi=vm.createContext({window:{lfLang:()=>'vi',LF_I18N_VI:{'未配置':'Chưa cấu hình'}}});
 vm.runInContext(impl,vi);
 assert.equal(vm.runInContext("workflowDraftCreatedNotice([{label:'未配置'},{label:'custom-id'}])",vi),'Đã tạo bản nháp SOP; chưa cấu hình 2 điều kiện thực thi (Chưa cấu hình, custom-id)');
 const zh=vm.createContext({window:{lfLang:()=>'zh'}});
 vm.runInContext(impl,zh);
 assert.equal(vm.runInContext("workflowDraftCreatedNotice([{label:'未配置'},{label:'custom-id'}])",zh),'SOP 草稿已创建；2 项运行依赖未配置（未配置、custom-id）');
});
