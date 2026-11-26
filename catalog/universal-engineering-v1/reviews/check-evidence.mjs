import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {evidenceGate} from './evidence-gate.mjs';
const [recordFile,traceDir,revision]=process.argv.slice(2);
if(!recordFile||!traceDir||!revision||!/^[a-f0-9]{40}$/.test(revision))throw Error('Usage: node check-evidence.mjs records.json trace-directory exact-candidate-sha');
const matrix=JSON.parse(fs.readFileSync(new URL('./resource-matrix.json',import.meta.url),'utf8'));
const records=JSON.parse(fs.readFileSync(recordFile,'utf8'));
const cases=matrix.resources.flatMap(r=>r.cases);
const result=evidenceGate(cases,records,revision);
for(const r of records){for(const field of ['traceSha256','reviewSha256']){const h=r[field];if(typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h))continue;const f=path.join(traceDir,h+'.json');try{if(fs.lstatSync(f).isSymbolicLink()||!fs.statSync(f).isFile()||crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==h)result.errors.push('invalid evidence file '+h)}catch{result.errors.push('missing evidence file '+h)}}}
result.eligibleForHumanReview=result.errors.length===0;
console.log(JSON.stringify(result,null,2));if(!result.eligibleForHumanReview)process.exitCode=1;
