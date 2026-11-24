import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {buildRequests,parseRank,candidateLedger} from '../skillhub/ranking-core.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../skillhub/ranking-queries.json',import.meta.url),'utf8'));
const categories=["dev-programming","ai-agent","it-ops-security","design-media","data-analysis","knowledge-management"];
const reqs=buildRequests(config,categories);
const obs="2026-11-24T09:11:08Z";
const fixture={"code":0,"data":{"total":4,"skills":[{"ownerName":"author-one","slug":"example","score":900,"downloads":500,"installs":10,"stars":2,"version":"1.2.3"},{"ownerName":"author-two","slug":"example","score":800,"downloads":400},{"slug":"missing-owner"},{"ownerName":"author-one","slug":"example"}]}};
const tests=[
["overall is independent of category scope",()=>reqs[0].path==="/api/skills/top"&&reqs[0].kind==="overall"],
["all 50 targets have two metric queries",()=>reqs.filter(x=>x.kind==="keyword").length===100],
["category scopes query two metrics",()=>reqs.filter(x=>x.kind==="category").length===12],
["inactive category not submitted",()=>!buildRequests(config,[]).some(x=>x.params.category)],
["namespace collision remains separate",()=>parseRank(reqs[1],fixture,obs).results.length===2],
["missing namespace and duplicate quarantined as warnings",()=>parseRank(reqs[1],fixture,obs).warnings.length===2],
["position preserves source order",()=>parseRank(reqs[1],fixture,obs).results[1].position===2],
["observed version is not verified pin",()=>parseRank(reqs[1],fixture,obs).results[0].observedVersion==="1.2.3"&&parseRank(reqs[1],fixture,obs).results[0].verifiedVersion===null],
["missing metric is unknown rather than zero",()=>parseRank(reqs[1],fixture,obs).results[1].installs===null],
["no automatic selection or promotion",()=>parseRank(reqs[1],fixture,obs).results.every(x=>x.status==="quarantined"&&!x.installed&&!x.certified)],
["malformed response rejected",()=>{try{parseRank(reqs[1],{code:1,data:{skills:[]}},obs);return false}catch{return true}}],
["missing queries cannot create candidates",()=>candidateLedger(config,[]).every(x=>x.queriesCompleted===0&&x.candidates.length===0&&x.selected===null)],
["keyword rank is not category rank",()=>{const q=reqs.find(x=>x.kind==="keyword");const l=candidateLedger(config,[parseRank(q,fixture,obs)])[0];return l.candidates.length===2&&l.candidates.every(x=>x.categoryEvidence.length===0&&x.overallEvidence.length===0&&!x.selected)}],
["category match has separately attributed evidence",()=>{const q=reqs.find(x=>x.kind==="keyword"),c=reqs.find(x=>x.id==="category:ai-agent:score");const l=candidateLedger(config,[parseRank(q,fixture,obs),parseRank(c,fixture,obs)])[0];return l.candidates.every(x=>x.categoryEvidence.length===1&&x.keywordEvidence.length===1)}]
];
for(const [name,fn] of tests)test(name,()=>assert.equal(fn(),true));
