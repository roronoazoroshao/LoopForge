import {test,expect,watchErrors} from './fixtures.mjs';
const templates=[['generic-backend-delivery',8],['generic-frontend-delivery',8],['issue-fix-production',8],['generic-product-delivery',5]];
const names={
 clarify:['需求定型','Requirement scoping','Chốt yêu cầu'],design:['方案设计','Solution design','Thiết kế giải pháp'],
 implement:['开发实现','Implementation','Triển khai'],review:['独立评审','Independent review','Rà soát độc lập'],
 test:['测试验证','Testing and verification','Kiểm thử và xác minh'],accept:['人工验收','Human acceptance','Nghiệm thu thủ công'],
 deliver:['交付汇总','Delivery summary','Tổng hợp bàn giao'],mr:['发起 MR','Create Merge Request','Tạo Merge Request'],
};
for(const [id,count] of templates){
 test('all public seed labels and reject edge layout: '+id,async({page})=>{
  test.setTimeout(120000);
  const errors=watchErrors(page);
  await page.goto('/#/flow/'+id);
  for(const [lang,i,label] of [['vi',2,'Trả về khi thất bại'],['en',1,'Send back on failure'],['zh',0,'失败打回'],['vi',2,'Trả về khi thất bại']]){
   const button=page.locator('#langToggle [data-lang-value="'+lang+'"]');
   if(await button.getAttribute('aria-checked')!=='true')await Promise.all([page.waitForEvent('load'),button.click()]);
   await expect(page.locator('#nodes .flow-node')).toHaveCount(count);
   const ids=count===5?['clarify','design','review','accept','deliver']:Object.keys(names);
   for(const stage of ids){
    const node=page.locator('#nodes .flow-node[data-id="'+stage+'"]');
    await expect(node.locator('.node-title')).toHaveText(names[stage][i]);
    if(stage!=='accept')await expect(node.locator('.node-subtitle')).toHaveText(names[stage][i]);
   }
   const labels=page.locator('#edges .fd-e-label');
   await expect(labels.first()).toBeVisible();
   for(const el of await labels.all()){
    await expect(el.locator('text')).toHaveText(label);
    const metric=await el.evaluate(g=>({text:g.querySelector('text').getComputedTextLength(),rect:g.querySelector('rect').getBBox().width}));
    expect(metric.text+12).toBeLessThanOrEqual(metric.rect);
   }
  }
  expect(errors).toEqual([]);
 });
}
