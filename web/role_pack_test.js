// Regression tests for role pack import/export. Run: node role_pack_test.js app/role-pack.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.argv[2],'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(source,context,{filename:'role-pack.js'});
const p=context.window.LoopForgeRolePack;
assert.ok(p,'role pack API should be available without DOM');
const role={
 id:'engineering-lead',name:'Engineering Lead',description:'Technical coordination',prompt:'Check {{input}} and {{feedback}}',
 executorId:'claude',model:'auto/best-coding',effort:'high',
 rules:['public-engineering'],skills:['planning'],mcpServers:['github-readonly'],
 platformMcp:true,knowledgeBase:true,
 loop:{enabled:true,maxIterations:2,exitCondition:'all_gates_pass',onExhausted:'human',feedbackPrompt:'Read {{feedback}}'},
 artifactOutputs:[{name:'plan',path:'engineering/plan.md',mediaType:'text/markdown',required:true}],
 verification:[{id:'gate-1',name:'Plan exists',mode:'command',commands:['test -s engineering/plan.md'],executionScope:'run',onFailure:'loop'}],
 interventions:[{id:'approval',name:'Review',stage:'after_execution',required:true}],
 hooks:[{id:'audit',name:'Audit',event:'PostToolUse',language:'shell',script:'echo checked',timeoutSec:10,executionScope:'run'}],
};
const raw={format:'loopforge-role-pack',schemaVersion:1,roles:[role]};
const parse=body=>p.parse(JSON.stringify(body));
const pack=parse(raw);
assert.equal(pack.roles.length,1);
assert.equal(pack.roles[0].artifactOutputs[0].path,'engineering/plan.md');
const env={
 projectId:'project-a',existingAgents:[],
 rules:[{id:'public-engineering',projectId:'project-a'}],
 skills:[{id:'planning',projectId:'project-a'}],
 mcpServers:[{id:'github-readonly',scope:'project',projectId:'project-a'}],
 executors:[{id:'claude'}],
};
let plan=p.preflight(pack,env);
assert.equal(plan.errors.length,0,JSON.stringify(plan.errors));
assert.equal(plan.ready.length,1);
assert.equal(plan.ready[0].projectId,'project-a');
assert.equal(plan.ready[0].version,1);
assert.equal(plan.ready[0].shared,false);
assert.equal(plan.scriptCount,2); // a command gate and a lifecycle hook
assert.equal(plan.ready[0].loop.maxIterations,2);
assert.deepEqual(JSON.parse(JSON.stringify(plan.ready[0].verification[0].commands)),['test -s engineering/plan.md']);
assert.ok(!('updatedAt' in plan.ready[0]));

const diverseRole={
 ...role,
 artifactOutputs:[{name:'Preview film',path:'exports/final-film.mp4',mediaType:'video/mp4',required:true}],
 verification:[{id:'manual-review',name:'Review video',mode:'manual',required:true,onFailure:'human'}],
 interventions:[{id:'before',name:'Human planning approval',stage:'before_execution',required:true}],
};
const diverse=parse({...raw,roles:[diverseRole]});
assert.equal(diverse.roles[0].artifactOutputs[0].mediaType,'video/mp4');
assert.equal(diverse.roles[0].verification[0].mode,'manual');
assert.equal(diverse.roles[0].interventions[0].stage,'before_execution');


const exported=p.exportPack([{...role,projectId:'another-project',version:9,shared:true,updatedAt:'2026-11-23T00:00:00Z'}]);
assert.equal(exported.format,'loopforge-role-pack');
assert.equal(exported.schemaVersion,1);
assert.ok(!('projectId' in exported.roles[0]));
assert.ok(!('shared' in exported.roles[0]));
assert.ok(!('version' in exported.roles[0]));
assert.ok(!('updatedAt' in exported.roles[0]));
assert.equal(parse(exported).roles[0].prompt,role.prompt);

const fromServer=p.exportPack([{id:'simple',name:'Simple',description:'',prompt:'',rules:null,skills:null,mcpServers:null,verification:null,artifactOutputs:null,hooks:null,loop:{enabled:false,maxIterations:3,exitCondition:'all_gates_pass',onExhausted:'fail'}}]);
assert.deepEqual(JSON.parse(JSON.stringify(fromServer.roles[0].rules)),[]);
assert.deepEqual(JSON.parse(JSON.stringify(fromServer.roles[0].verification)),[]);


assert.ok(p.preflight(pack,{...env,existingAgents:[{id:'engineering-lead',projectId:'other-project'}]}).errors.some(s=>s.includes('engineering-lead')));
assert.ok(p.preflight(pack,{...env,skills:[]}).errors.some(s=>s.includes('planning')));
assert.ok(p.preflight(pack,{...env,mcpServers:[]}).errors.some(s=>s.includes('github-readonly')));
assert.ok(p.preflight(pack,{...env,rules:[]}).errors.some(s=>s.includes('public-engineering')));
assert.ok(p.preflight(pack,{...env,executors:[]}).errors.some(s=>s.includes('claude')));
assert.ok(p.preflight(pack,{...env,projectId:''}).errors.length>0);
assert.ok(p.preflight(pack,{...env,existingAgents:[],skills:[{id:'planning',projectId:'other',shared:false}]}).errors.length>0);

assert.throws(()=>parse({...raw,schemaVersion:2}),/schemaVersion/);
assert.throws(()=>parse({...raw,roles:[role,{...role}]}),/duplicate/i);
assert.throws(()=>parse({...raw,roles:[]}),/roles/);
assert.throws(()=>parse({...raw,roles:[{...role,artifactOutputs:[{name:'bad',path:'../secrets.txt'}]}]}),/path/);
assert.throws(()=>parse({...raw,roles:[{...role,artifactOutputs:[{name:'bad',path:'/etc/passwd'}]}]}),/path/);
assert.throws(()=>parse({...raw,roles:[{...role,apiKey:'do-not-store'}]}),/apiKey/);
assert.throws(()=>parse({...raw,roles:[{...role,hooks:[{...role.hooks[0],event:'Unknown'}]}]}),/event/);
assert.throws(()=>parse({...raw,roles:[{...role,verification:[{...role.verification[0],commands:[]}]}]}),/commands/);
assert.throws(()=>p.parse('x'.repeat(1024*1024+1)),/size|large/i);

(async ()=>{
 let written=[];
 const result=await p.importRoles(plan,async r=>{written.push(r);return {...r,updatedAt:'now'}});
 assert.equal(result.created.length,1);
 assert.equal(result.failed,null);
 assert.equal(written[0].id,'engineering-lead');
 assert.equal(written[0].shared,false);
 const many=parse({...raw,roles:[role,{...role,id:'tester',name:'Tester'}]});
 const batch=p.preflight(many,env);
 const partial=await p.importRoles(batch,async r=>{
  if(r.id==='tester')throw new Error('service unavailable');
  return r;
 });
 assert.equal(partial.created.length,1);
 assert.equal(partial.failed.id,'tester');
 assert.match(partial.failed.message,/service unavailable/);
 assert.equal(partial.pending,0);
 console.log('role pack tests passed');
})().catch(err=>{console.error(err);process.exitCode=1});
