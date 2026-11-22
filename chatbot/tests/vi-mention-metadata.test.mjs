import {test} from "vitest";
import assert from "node:assert/strict";
import {referenceTypes,referenceTypeLabel,referenceTypeHint} from "../src/mentions.js";
import {titleRevealTiming} from "../src/title-reveal.js";
import {devServerLabel} from "../src/agent-browser-links.js";
test("Vietnamese mention categories preserve protocol type values",()=>{
 const old=localStorage.getItem("loopforge.lang");
 try {
  localStorage.setItem("loopforge.lang","vi");
  assert.deepEqual(referenceTypes.map(x=>x.type),["agent","skill","issue","sop","run","repository"]);
  assert.equal(referenceTypeLabel("agent"),"Vai trò");
  assert.equal(referenceTypeHint("repository"),"Thêm ngữ cảnh kho mã");
  assert.equal(referenceTypeLabel("unknown"),"unknown");
  assert.equal(devServerLabel("file"),"Tệp workspace");
  assert.equal(devServerLabel(8080),"localhost:8080");
  assert.equal(titleRevealTiming("").chars.join(""),"Hội thoại mới");
  localStorage.setItem("loopforge.lang","zh");
  assert.equal(referenceTypeLabel("agent"),"角色");
  assert.equal(devServerLabel("file"),"工作区文件");
  assert.equal(titleRevealTiming("").chars.join(""),"新对话");
 } finally {if(old===null)localStorage.removeItem("loopforge.lang");else localStorage.setItem("loopforge.lang",old);}
});
