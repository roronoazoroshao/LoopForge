import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp,settle} from '../lib/load-app.mjs';

const assets=[
  ['rules','public-engineering','工程与验证约束','Engineering and verification rules','Quy tắc kỹ thuật và xác minh'],
  ['dockerfiles','generic-backend','公共开发环境','Shared development environment','Môi trường phát triển dùng chung'],
  ['sandboxes','generic-docker','Docker 隔离沙箱','Docker sandbox','Sandbox cách ly bằng Docker'],
  ['sandboxes','local','本地执行（仅可信任务）','Local execution (trusted tasks only)','Thực thi cục bộ (chỉ tác vụ đáng tin cậy)'],
];
for(const [locale,index,personal,description,duty,preview,subSOP] of [
  ['zh',2,'个人专属','暂无说明','未填写职责','构建静态站点','后端交付 SOP'],
  ['en',3,'Personal','No description','No responsibility entered','Build static site','Backend delivery SOP'],
  ['vi',4,'Cá nhân','Chưa có mô tả','Chưa nhập trách nhiệm','Xây dựng trang web tĩnh','SOP bàn giao backend'],
]){
  test('explicit system copy and user metadata remain distinct in '+locale,async t=>{
    const app=await loadApp({locale});t.after(app.close);
    for(const row of assets){
      const [type,id,raw]=row;
      const label=(item)=>app.evaluate(`assetDisplayName(${JSON.stringify(item)},${JSON.stringify(type)})`);
      assert.equal(label({id,name:raw}),row[index]);
      assert.equal(label({id,name:raw,projectId:'project-1'}),raw);
      assert.equal(label({id:'custom',name:raw}),raw);
      assert.equal(label({id,name:'用户更名'}),'用户更名');
    }
    const parse=html=>{const el=app.document.createElement('div');el.innerHTML=html;return el;};
    app.evaluate('state.assetType="rules"');
    const custom={id:'custom-asset',name:'用户资产',projectId:'project-1',description:''};
    const card=item=>parse(app.evaluate('assetCardHTML('+JSON.stringify(item)+')'));
    assert.equal(card(custom).querySelector('.asset-card-desc').textContent,description);
    assert.equal(card({...custom,description:'用户说明 <&'}).querySelector('.asset-card-desc').textContent,'用户说明 <&');
    const mcp=[{id:'mcp-empty',name:'用户 MCP',scope:'personal',ownerUserId:17,description:''},
      {id:'mcp-custom',name:'自定义 MCP',scope:'personal',ownerUserId:17,description:'用户说明 <&'}];
    app.evaluate('state.currentUser={id:17,name:"Tester",isGuest:false};state.mcpScope="personal";state.mcpQuery="";state.data.mcpServers='+JSON.stringify(mcp)+';renderMCPManagement()');
    await settle(2);
    const cards=[...app.document.querySelectorAll('#mcpMarketGrid .mcp-market-card')];
    const emptyCard=cards.find(el=>el.querySelector('h3')?.textContent==='用户 MCP');
    const userCard=cards.find(el=>el.querySelector('h3')?.textContent==='自定义 MCP');
    assert.ok(emptyCard);assert.ok(userCard);
    assert.equal(emptyCard.querySelector('small').textContent,personal);
    assert.equal(emptyCard.querySelector('p').textContent,description);
    assert.equal(userCard.querySelector('p').textContent,'用户说明 <&');
    app.evaluate('state.agentCreatePreset="";$("#agentForm").elements.description.value="";renderAgentCreateReview()');
    const values=()=>[...app.document.querySelectorAll('#agentCreateReview dd')].map(x=>x.textContent);
    assert.equal(values().at(-1),duty);
    app.evaluate('$("#agentForm").elements.description.value="用户说明 <&";renderAgentCreateReview()');
    assert.equal(values().at(-1),'用户说明 <&');
  });
  test('preview and nested SOP use display-only names in '+locale,async t=>{
    const app=await loadApp({locale});t.after(app.close);
    const previewNode={id:'af-preview-build',type:'agent',agentId:'af-preview-builder',name:'构建静态站点'};
    const reference={id:'review-seed-copy',name:'后端交付 SOP',projectId:'project-1',tags:['generic-source:generic-backend-delivery'],nodes:[],edges:[]};
    const custom={...reference,id:'review-custom-copy',tags:[]};
    const nested={id:'sub',name:'用户节点',type:'sop',sopWorkflowId:reference.id,position:{x:100,y:100}};
    const wf={id:'review-parent',name:'Parent',projectId:'project-1',preview:{enabled:true},nodes:[nested],edges:[]};
    app.evaluate('switchView("flow");state.projectFilter="project-1";state.workflow='+JSON.stringify(wf)+';state.data.workflows.push('+JSON.stringify(reference)+','+JSON.stringify(custom)+');state.selectedNode="sub";');
    assert.equal(app.evaluate('sopSeedNodeDisplayName('+JSON.stringify(previewNode)+')'),preview);
    assert.equal(app.evaluate('sopSeedNodeDisplayName('+JSON.stringify({...previewNode,agentId:'custom'})+')'),previewNode.name);
    assert.equal(app.evaluate('nodeMeta(state.workflow.nodes[0]).subtitle'),subSOP);
    assert.equal(app.evaluate('nodeMeta({type:"sop",sopWorkflowId:'+JSON.stringify(custom.id)+'}).subtitle'),custom.name);
    app.evaluate('renderProperties();renderCanvas()');await settle(2);
    const select=app.document.querySelector('#properties select[data-p="sopWorkflowId"]');
    assert.ok(select);
    assert.equal(select.querySelector('option[value="'+reference.id+'"]').textContent,subSOP);
    assert.equal(select.querySelector('option[value="'+custom.id+'"]').textContent,custom.name);
    assert.equal(app.document.querySelector('#nodes [data-id="sub"] .node-subtitle').textContent,subSOP);
    assert.equal(app.evaluate('state.workflow.nodes[0].name'),nested.name);
    assert.equal(app.evaluate('state.data.workflows.find(w=>w.id==='+JSON.stringify(reference.id)+').name'),reference.name);
  });
}
