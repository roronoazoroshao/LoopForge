import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../web/app/observability.js',import.meta.url),'utf8');
test('insight descriptions are produced in Vietnamese and preserve counts',()=>{
 const c=vm.createContext({window:{lfLang:()=>'vi'},state:{analytics:{delivery:{issues:5,delivered:2,averageDurationMs:2500,averageExecutionDurationMs:1500},summary:{runsPerIssue:1.8,failuresPerIssue:0.2}},obsTrendGrain:'all'},obsFunnelStats:()=>({worst:-1,stages:[]}),duration:n=>n+'ms',escapeHTML:x=>x});
 vm.runInContext(source,c);
 const html=vm.runInContext("obsInsights({},'delivery')",c);
 assert.match(html,/yêu cầu đã bàn giao/);
 assert.match(html,/2 \/ 5/);
 assert.match(html,/data-i18n-skip/);
 assert.doesNotMatch(html,/单已交付/);
});
