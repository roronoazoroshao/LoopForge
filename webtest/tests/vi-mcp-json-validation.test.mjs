import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('../../web/app/mcp.js',import.meta.url),'utf8');
const part=s.slice(s.indexOf('function mcpCopy('),s.indexOf('function mcpApplyImportedServer('));
function f(lang){const c=vm.createContext({window:{lfLang:()=>lang}});vm.runInContext(part,c);return c}
test('MCP import validation translates explanations without changing field names or identifiers',()=>{
 const vi=f('vi'),zh=f('zh');
 assert.throws(()=>vm.runInContext("mcpImportStringMap([], 'headers')",vi),/headers phải là đối tượng JSON/);
 assert.throws(()=>vm.runInContext("mcpNormalizeImportedServer({id:'例子',transport:'http',url:''})",vi),/例子 thiếu HTTP URL/);
 assert.throws(()=>vm.runInContext("mcpNormalizeImportedServer({id:'demo',timeoutSec:900,command:'cmd'})",vi),/demo.timeoutSec phải nằm trong khoảng 0–600/);
 assert.throws(()=>vm.runInContext("mcpImportStringMap([], 'headers')",zh),/headers 必须是 JSON 对象/);
 const server=vm.runInContext("mcpNormalizeImportedServer({id:'demo',url:'https://x',headers:{Key:'值'}})",vi);
 assert.equal(server.headers.Key,'值');assert.equal(server.id,'demo');
});
