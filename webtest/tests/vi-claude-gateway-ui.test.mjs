import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const workbench=readFileSync(new URL('../../web/app/workbench.js',import.meta.url),'utf8');
function probeError(lang,message,baseURL,engine='claude-code'){
 const a=workbench.indexOf('function credentialProbeDisplayError(');
 const b=workbench.indexOf('async function probeCredentialCatalog(',a);
 assert.ok(a>=0&&b>a,'missing real credential probe error helper');
 const context={window:{lfLang:()=>lang},result:null,message,baseURL,kind:{models:{engine}}};
 runInNewContext(workbench.slice(a,b)+
   '\nresult=credentialProbeDisplayError(message,kind,baseURL);',context);
 return context.result;
}

test('Vietnamese Claude gateway failure explains localhost inside Docker',()=>{
 const raw='获取模型列表失败：无法连接 http://localhost:20128/v1/models：connection refused';
 const vi=probeError('vi',raw,'http://localhost:20128/v1');
 assert.match(vi,/LoopForge chạy trong Docker/);
 assert.match(vi,/localhost trỏ tới container/);
 assert.doesNotMatch(vi,/[\u3400-\u9fff]/u);
 assert.equal(probeError('zh',raw,'http://localhost:20128/v1'),raw);
});

test('remote discovery failures preserve gateway URL and provider details',()=>{
 const raw='获取模型列表失败：无法连接 https://gateway.example/v1/models：timeout';
 const vi=probeError('vi',raw,'https://gateway.example');
 assert.match(vi,/Không tải được danh sách mô hình/);
 assert.match(vi,/https:\/\/gateway.example\/v1\/models/);
 assert.match(vi,/timeout/);
 assert.doesNotMatch(vi,/[\u3400-\u9fff]/u);
});

test('empty model list explains manual IDs without altering technical IDs',()=>{
 assert.match(probeError('vi','服务没有返回可用模型，可以手动添加模型','https://gateway.example'),/thêm ID mô hình thủ công/);
 assert.equal(probeError('vi','Unknown provider response: omniroute/auto','https://gateway.example'),
   'Unknown provider response: omniroute/auto');
});
