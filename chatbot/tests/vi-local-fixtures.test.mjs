import { test } from "vitest";
import assert from "node:assert/strict";
import { createLocalConversations } from "../src/local-conversation-fixtures.js";
test("new Vietnamese preview fixtures localize content without changing IDs, roles, or filenames", () => {
  const old=localStorage.getItem("loopforge.lang");
  try {
    localStorage.setItem("loopforge.lang","zh");
    const zh=createLocalConversations({id:17,loginName:"fixture"},"model-id");
    localStorage.setItem("loopforge.lang","vi");
    const vi=createLocalConversations({id:17,loginName:"fixture"},"model-id");
    assert.equal(vi.length,12);
    assert.deepEqual(vi.map(s=>s.id),zh.map(s=>s.id));
    const filenames=s=>[...s.matchAll(/filename=([^\n]+)/g)].map(m=>m[1]);
    for(let i=0;i<vi.length;i++){
      const a=vi[i],b=zh[i];
      assert.doesNotMatch(a.title,/\p{Script=Han}/u);
      assert.equal(a.model,b.model);
      assert.deepEqual(a.messages.map(m=>m.role),b.messages.map(m=>m.role));
      for(let j=0;j<a.messages.length;j++){
        const m=a.messages[j],n=b.messages[j];
        assert.deepEqual(filenames(m.content),filenames(n.content));
        assert.doesNotMatch(m.content.replace(/filename=[^\n]+/g,""),/\p{Script=Han}/u);
        assert.equal(m.activity?.length,n.activity?.length);
        for(const item of m.activity||[])assert.doesNotMatch(item.text,/\p{Script=Han}/u);
      }
    }
    localStorage.setItem("loopforge.lang","en");
    assert.deepEqual(createLocalConversations({}, "").map(s=>s.title),zh.map(s=>s.title));
  } finally {if(old===null)localStorage.removeItem("loopforge.lang");else localStorage.setItem("loopforge.lang",old);}
});
