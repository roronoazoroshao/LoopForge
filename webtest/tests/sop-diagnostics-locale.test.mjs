import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp, settle} from '../lib/load-app.mjs';

const templateId='generic-backend-delivery';
const raw='需求定型';
for(const [locale,display,referenceName,deleteMessage,edgeAction,rejectAction,rejectPhrase] of [
  ['vi','Chốt yêu cầu','SOP bàn giao frontend chung','Đã xóa','Nhấp để xóa','Nhấp để hủy','trả về khi thất bại tới'],
  ['en','Requirement scoping','Generic frontend delivery SOP','Deleted','Click to delete','Click to cancel','sends back on failure to'],
  ['zh',raw,'通用前端交付 SOP','已删除','点击删除','点击取消','失败打回到'],
]){
  test('SOP diagnostics, SVG titles and deletion preserve seed provenance in '+locale,async t=>{
    const app=await loadApp({locale});t.after(app.close);
    const reference={id:'generic-frontend-delivery',name:'通用前端交付 SOP',generic:true,nodes:[],edges:[]};
    // The custom node deliberately has exactly the same text as the seed.
    const workflow={id:'diagnostics-test',name:'Test SOP',projectId:'project-1',
      tags:['generic-source:'+templateId],status:'draft',sandboxProfileId:'local',
      nodes:[
        {id:'clarify',name:raw,type:'agent',agentId:'',rejectTo:'custom',position:{x:100,y:100}},
        {id:'custom',name:raw,type:'sop',sopWorkflowId:reference.id,position:{x:380,y:100}},
      ],edges:[{id:'e',source:'clarify',target:'custom',when:'success'}]};
    app.evaluate('switchView("flow");state.projectFilter="project-1";state.workflow='+JSON.stringify(workflow)+';state.data.workflows.push('+JSON.stringify(reference)+');state.selectedNode=null;');
    const before=app.evaluate('JSON.stringify(state.workflow)');
    app.evaluate('setFlowView("check")');await settle(2);
    const rows=[...app.document.querySelectorAll('#flowCheckPanel .flow-check-item')];
    assert.ok(rows[0].querySelector('p').textContent.includes(display));
    assert.ok(rows.some(r=>r.querySelector('b').textContent===display));
    const custom=rows.find(r=>r.querySelector('p').textContent.includes(referenceName));
    assert.ok(custom,'referenced SOP display name');
    assert.equal(custom.querySelector('b').textContent,raw,'same-text custom node must remain unchanged');
    if(locale!=='zh')for(const r of rows){
      assert.doesNotMatch(r.querySelector('p').textContent,/\p{Script=Han}/u);
      if(r!==custom)assert.doesNotMatch(r.querySelector('b').textContent,/\p{Script=Han}/u);
    }
    app.evaluate('setFlowView("canvas");renderEdges()');await settle(2);
    const success=app.document.querySelector('#edges [data-edge="e"] title');
    const rejection=app.document.querySelector('#edges [data-reject-from="clarify"] title');
    assert.equal(success?.textContent,`${display} → ${raw} · ${edgeAction}`);
    assert.equal(rejection?.textContent,`${display} ${rejectPhrase} ${raw} · ${rejectAction}`);
    assert.equal(app.evaluate('JSON.stringify(state.workflow)'),before,'rendering never persists display labels');
    assert.equal(app.evaluate('removeNode("clarify")'),true);await settle(2);
    assert.equal(app.document.querySelector('#flowToastMsg')?.textContent,
      locale==='zh'?`${deleteMessage}「${display}」`:`${deleteMessage} “${display}”`);
    assert.equal(app.evaluate('state.workflow.nodes[0].name'),raw);
    app.evaluate('flowToast("已撤销")');await settle(2);
    assert.equal(app.document.querySelector('#flowToastMsg')?.hasAttribute('data-i18n-skip'),false,
      'subsequent untranslated legacy toast must still reach the DOM translator');
  });
}
