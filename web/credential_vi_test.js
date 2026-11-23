// Regression: dynamic credentials and model-catalog copy must be translated
// before rendering, rather than relying on fragmented DOM text replacement.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync(process.argv[2], 'utf8');
const ctx = { window: { lfLang: () => 'vi' }, console };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const dsh = vm.runInContext("CREDENTIAL_KINDS.find(k => k.agentCli === 'dsh')", ctx);
assert.equal(dsh.placeholder, 'Nhập API Key DeepSeek Harness');
assert.ok(dsh.description.startsWith('Trong cuộc trò chuyện AI'), dsh.description);
assert.ok(dsh.guide.some(row => row[0].includes('Base URL')), JSON.stringify(dsh.guide));
const catalog = ctx.credentialCatalogCopy('remote', dsh);
assert.equal(catalog.title, 'Theo danh mục mô hình của dịch vụ');
const detail = ctx.credentialCatalogDetailHTML('remote', dsh, 'chat');
assert.ok(detail.includes('Khi danh mục trống') && detail.includes('<code') && !detail.includes('目录为空时'), detail);
const official = ctx.credentialCatalogCopy('official', dsh);
assert.ok(official.detail.includes('DeepSeek Harness') && !official.detail.includes('目录为空时'), official.detail);
ctx.window.lfLang = () => 'zh';
assert.equal(vm.runInContext("agentCliCredentialKind('dsh',{name:'DeepSeek Harness'}).placeholder",ctx),'请输入 DeepSeek Harness API Key');
console.log('Vietnamese credential copy ok');
