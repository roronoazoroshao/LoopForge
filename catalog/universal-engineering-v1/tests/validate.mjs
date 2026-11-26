import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const list=p=>fs.readdirSync(path.join(root,p)).filter(x=>x.endsWith('.json')).sort().map(x=>load(p+'/'+x));
const cap=load('capability/manifest.json');
const dataset={rules:cap.rules,skills:cap.skills,roles:load('role-pack.json').roles,sops:list('sops'),pipelines:list('pipelines'),market:load('skillhub/targets.json'),profiles:load('profiles.json')};
function validate(d){
 const errors=[];const check=(v,m)=>{if(!v)errors.push(m)}; const count={rules:24,skills:16,roles:32,sops:24,pipelines:8,market:50,profiles:4};
 for(const [k,n] of Object.entries(count))check(Array.isArray(d[k])&&d[k].length===n,k+" count");
 const all=[...d.rules,...d.skills,...d.roles,...d.sops,...d.pipelines];const ids=all.map(a=>a.id);check(new Set(ids).size===ids.length,"duplicate IDs");check(ids.every(x=>/^lf-[a-z0-9-]+$/.test(x)&&x.length<=64),"invalid ID");
 const rule=new Set(d.rules.map(x=>x.id)),skill=new Set(d.skills.map(x=>x.id)),role=new Map(d.roles.map(x=>[x.id,x])),sop=new Set(d.sops.map(x=>x.id));
 for(const a of d.roles){check(a.rules.every(x=>rule.has(x)),a.id+" unresolved rule");check(a.skills.every(x=>skill.has(x)),a.id+" unresolved skill");check(!a.executorId&&!a.model&&!a.platformMcp&&!a.knowledgeBase&&!a.mcpServers.length&&!a.hooks.length,a.id+" privileged/default provider");check(a.artifactOutputs.every(x=>x.required&&/^[a-z0-9-]+\.md$/.test(x.path)),a.id+" unsafe artifact path")}
 for(const w of [...d.sops,...d.pipelines]){const node=new Map(w.nodes.map((x,i)=>[x.id,i]));check(w.status==="draft",w.id+" published");check(node.size===w.nodes.length,w.id+" duplicate node");check(w.nodes.some(x=>x.type==="approval"),w.id+" missing approval");for(const n of w.nodes){if(n.type==="agent"){check(role.has(n.agentId),w.id+" missing role");check(JSON.stringify(n.artifactOutputs)===JSON.stringify(role.get(n.agentId)?.artifactOutputs),w.id+" artifact mismatch")}else if(n.type==="sop")check(sop.has(n.sopWorkflowId),w.id+" missing child");else if(n.type==="approval")check(node.has(n.rejectTo)&&node.get(n.rejectTo)<node.get(n.id)&&n.maxReworks===2,w.id+" invalid rejection");else check(false,w.id+" unknown type")}check(w.edges.length===w.nodes.length-1&&w.edges.every((e,i)=>e.when==="success"&&e.source===w.nodes[i].id&&e.target===w.nodes[i+1].id),w.id+" invalid sequence")}
 check(d.market.every(x=>x.status==="pending"&&!x.installed&&!x.version&&!x.license&&!x.sha256&&!x.review),"unsubstantiated marketplace approval");
 return errors;
}
function verify(d){const tests=[];const run=(name,mutate,want)=>{const copy=JSON.parse(JSON.stringify(d));mutate(copy);const errs=validate(copy);tests.push({name,pass:want?errs.some(e=>e.includes(want)):errs.length===0,errors:errs})};run("valid candidate",()=>{},"");run("missing role skill",x=>x.roles[0].skills.push("lf-nonexistent"),"unresolved skill");run("duplicate id",x=>x.rules[1].id=x.rules[0].id,"duplicate IDs");run("unsafe artifact",x=>x.roles[0].artifactOutputs[0].path="../secret","unsafe artifact path");run("missing workflow role",x=>x.sops[0].nodes[0].agentId="unknown","missing role");run("missing nested workflow",x=>x.pipelines[0].nodes[0].sopWorkflowId="unknown","missing child");run("invalid rejection",x=>x.sops[0].nodes.at(-1).rejectTo="accept","invalid rejection");run("premature certification",x=>x.market[0].installed=true,"unsubstantiated");run("privilege default",x=>x.roles[0].platformMcp=true,"privileged");run("published draft",x=>x.sops[0].status="published","published");return tests}
const tests=verify(dataset);for(const t of tests)console.log(t.pass?'PASS':'FAIL',t.name,t.pass?'':JSON.stringify(t.errors));
for(const s of dataset.skills){const f=path.join(root,'capability','skills',s.id,'SKILL.md');if(!fs.existsSync(f)||!fs.readFileSync(f,'utf8').trim())throw Error('Missing skill file '+s.id)}
if(tests.some(t=>!t.pass))process.exitCode=1;
