const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.argv[2],'utf8');
const events=new Map(),elements={},toasts=[],requests=[],created=[],downloaded=[];
function element(id){
  const obj={id,checked:false,disabled:false,textContent:'',value:'',files:[],children:[],open:false,
    classList:{toggle:(_name,open)=>{obj.open=!!open}},
    setAttribute(){},focus(){},click(){obj.clicked=true},remove(){},
    appendChild(child){obj.children.push(child)},replaceChildren(){obj.children=[]},
    addEventListener(name,fn){events.set(id+':'+name,fn)}};
  return elements[id]=obj;
}
for(const id of ['rolePackImport','rolePackExport','rolePackPick','rolePackModal','rolePackStatus',
 'rolePackClose','rolePackCancel','rolePackApply','rolePackAcknowledge',
 'rolePackPreview','rolePackProblems','rolePackWarnings',
 'rolePackTitle','rolePackHelp','rolePackPreviewTitle','rolePackErrorTitle',
 'rolePackWarningTitle','rolePackAcknowledgeLabel'])element(id);
const document={readyState:'complete',getElementById:id=>elements[id],
 createElement:type=>({type,textContent:'',href:'',download:'',click(){downloaded.push(this)},remove(){}}),
 body:{appendChild(){}}};
const state={projectFilter:'project-a',data:{agents:[],executors:[{id:'claude'}]},agentScope:'project'};
const window={lfLang:()=> 'vi',lfT:(_zh,_en,vi)=>vi,confirm:()=>true};
const context=vm.createContext({window,document,state,
 api:async(path,opts={})=>{
   requests.push({path,method:opts.method||'GET'});
   if(opts.method==='PUT'){
     const role=JSON.parse(opts.body);
     if(state.data.agents.some(a=>a.id===role.id))throw Error('Existing agent collision');
     state.data.agents.push(role);created.push(role);return role;
   }
   if(path.startsWith('/api/agents'))return [...state.data.agents];
   if(['/api/rules','/api/skills','/api/mcp-servers'].includes(path))return [];
   throw Error('Unexpected request '+path);
 },
 toast:(message)=>toasts.push(message),
 visibleMCPAssets:x=>x,renderAgents(){},renderCanvas(){},renderWorkflowMeta(){},
 Blob:class{constructor(parts){this.parts=parts}},
 URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
 setTimeout:()=>{},
});
vm.runInContext(source,context);
const pack=id=>JSON.stringify({format:'loopforge-role-pack',schemaVersion:1,roles:[
 {id,name:'Engineering Lead',executorId:'claude',prompt:'{{input}}',rules:[],skills:[],mcpServers:[],
  verification:[{id:'file-check',name:'Check file',mode:'command',commands:['test -f output.md'],executionScope:'run'}],
  artifactOutputs:[{name:'Result',path:'output.md',required:true}]}
]});
(async()=>{
 assert.equal(elements.rolePackImport.textContent,'Nhập Role Pack');
 await events.get('rolePackImport:click')();
 assert.equal(elements.rolePackPick.clicked,true);
 const content=pack('engineering-lead');
 elements.rolePackPick.files=[{name:'roles.json',size:content.length,text:async()=>content}];
 await events.get('rolePackPick:change')();
 assert.equal(created.length,0,'preview must not write');
 assert.equal(elements.rolePackApply.disabled,true);
 assert.equal(elements.rolePackPreview.children[0].textContent,'Engineering Lead (engineering-lead)');
 assert.match(elements.rolePackWarnings.children[0].textContent,/Các vai trò được tạo lần lượt/);
 elements.rolePackAcknowledge.checked=true;
 events.get('rolePackAcknowledge:change')();
 assert.equal(elements.rolePackApply.disabled,false);
 await events.get('rolePackApply:click')();
 assert.equal(created.length,1);
 assert.equal(created[0].projectId,'project-a');
 assert.equal(created[0].shared,false);
 assert.equal(elements.rolePackModal.open,false);
 assert.equal(requests.filter(x=>x.method==='PUT').length,1);

 // Second import of same ID is blocked before a network write.
 elements.rolePackPick.files=[{name:'roles.json',size:content.length,text:async()=>content}];
 await events.get('rolePackPick:change')();
 assert.equal(elements.rolePackApply.disabled,true);
 assert.match(elements.rolePackProblems.children[0].textContent,/ID đã tồn tại/);
 assert.equal(requests.filter(x=>x.method==='PUT').length,1);

 // Untrusted display names must be placed in textContent, not as HTML.
 const malicious=pack('new-role').replace('Engineering Lead','<img src=x onerror=alert(1)>');
 elements.rolePackPick.files=[{name:'evil.json',size:malicious.length,text:async()=>malicious}];
 await events.get('rolePackPick:change')();
 assert.equal(elements.rolePackPreview.children[0].textContent,'<img src=x onerror=alert(1)> (new-role)');
 await events.get('rolePackExport:click')();
 assert.equal(downloaded.length,1);
 assert.match(downloaded[0].download,/^loopforge-roles-project-a\.json$/);
 console.log('role pack UI tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
