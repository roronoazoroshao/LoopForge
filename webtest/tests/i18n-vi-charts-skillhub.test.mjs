import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function load(name,lang){const c=vm.createContext({window:{lfLang:()=>lang}});vm.runInContext(fs.readFileSync(new URL('../../web/app/'+name,import.meta.url),'utf8'),c);return c;}
test('Vietnamese chart legend, heatmap axis and tooltip are translated before ECharts paints',()=>{
 const c=load('obs-charts.js','vi');
 const heat=vm.runInContext("obsHeatOption([{weekday:0,hour:9,runs:2}], 'runs', {})",c);
 assert.equal(heat.yAxis.data[0],'Thứ Hai');
 assert.match(heat.tooltip.formatter({value:[9,0,2],data:{runs:2,tokens:0}}),/Lượt chạy/);
 const phase=vm.runInContext("obsPhaseStackOption([{date:'2026-11-22',clarification:1,development:2,testing:3}],{})",c);
 assert.deepEqual([...phase.legend.data],['Làm rõ','Phát triển','Kiểm thử']);
 const zh=load('obs-charts.js','zh');
 assert.equal(vm.runInContext("obsHeatOption([], 'runs', {}).yAxis.data[0]",zh),'周一');
});
test('Vietnamese SkillHub counts and file quota explanations preserve numeric thresholds',()=>{
 const c=load('skillhub.js','vi');
 assert.equal(vm.runInContext('skillhubCount(16000)',c),'16 nghìn');
 assert.equal(vm.runInContext('skillhubCount(1e6)',c),'1 triệu');
 const zh=load('skillhub.js','zh');
 assert.equal(vm.runInContext('skillhubCount(16000)',zh),'1.6 万');
});
