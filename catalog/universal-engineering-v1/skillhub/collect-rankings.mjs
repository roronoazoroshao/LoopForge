import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildRequests, parseRank, candidateLedger} from './ranking-core.mjs';

const root=new URL('./ranking-queries.json',import.meta.url);
const config=JSON.parse(await fs.readFile(root,'utf8'));
const output=process.argv[2];
if(!output||process.argv.length!==3)throw Error('Usage: node collect-rankings.mjs <new-output-dir>');
await fs.mkdir(output,{recursive:false});
await fs.mkdir(path.join(output,'raw'));
const origin='https://api.skillhub.cn';
const limit=2*1024*1024;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const startedAt=new Date().toISOString();
const snapshots=[], failures=[], rawIndex=[];
async function fetchJSON(id,apiPath,params={}){
 if(!['/api/v1/categories','/api/skills/top','/api/skills'].includes(apiPath))throw Error('unexpected API path');
 const u=new URL(apiPath,origin);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('HTTP '+response.status);
 if(!response.body)throw Error('empty body');
 const reader=response.body.getReader();const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('response too large');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 const bytes=Buffer.concat(chunks);const data=JSON.parse(bytes.toString('utf8'));const observedAt=new Date().toISOString();
 const file=id.replace(/[^a-zA-Z0-9._-]/g,'_')+'.json';
 await fs.writeFile(path.join(output,'raw',file),bytes,{flag:'wx'});
 rawIndex.push({queryId:id,url:u.href,observedAt,file:'raw/'+file,sha256:sha(bytes)});
 return {data,observedAt};
}
let requests=[];
try{
 const cat=await fetchJSON('categories','/api/v1/categories');
 if(!Array.isArray(cat.data.items)||!cat.data.items.length)throw Error('invalid category dictionary');
 const active=cat.data.items.filter(x=>x.active===true&&typeof x.key==='string').map(x=>x.key);
 if(!active.length)throw Error('no active categories');
 requests=buildRequests(config,active);
 for(const q of requests){
  try{const {data,observedAt}=await fetchJSON(q.id,q.path,q.params);snapshots.push(parseRank(q,data,observedAt));}
  catch(error){failures.push({queryId:q.id,error:String(error.message).slice(0,200)});break;}
  await pause(500);
 }
}catch(error){failures.push({queryId:'categories',error:String(error.message).slice(0,200)});}
const result={schemaVersion:1,startedAt,finishedAt:new Date().toISOString(),provider:'skillhub',origin,source:'official API',status:failures.length||snapshots.length!==requests.length||!requests.length?'incomplete':'collected-not-reviewed',requestsPlanned:requests.length,requestsCompleted:snapshots.length,failures,rawIndex,snapshots,targets:candidateLedger(config,snapshots),selectedCount:0,certifiedCount:0,installedCount:0};
await fs.writeFile(path.join(output,'rankings.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,planned:result.requestsPlanned,completed:result.requestsCompleted,failures,selected:0},null,2));
if(result.status==='incomplete')process.exitCode=1;
