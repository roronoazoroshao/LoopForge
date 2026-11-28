import { test } from "vitest";
import assert from "node:assert/strict";
import { formatElapsed, confirmationCaption, api } from "../src/api.js";
import { artifactSourceLabel } from "../src/locale.js";

test("Vietnamese durations, artifact metadata and verified confirmation captions", async () => {
  const previous = localStorage.getItem("loopforge.lang");
  const oldFetch = globalThis.fetch;
  try {
    localStorage.setItem("loopforge.lang", "vi");
    assert.equal(formatElapsed(0), "Dưới 1 giây");
    assert.equal(formatElapsed(3661), "1 giờ 1 phút 1 giây");
    assert.equal(artifactSourceLabel("交付物"), "Sản phẩm bàn giao");
    assert.equal(artifactSourceLabel("用户自定义"), "用户自定义");
    const message = { role:"user", content:"不走 SOP，这件事由你直接完成。" };
    const previousTurn = {role:"assistant",content:JSON.stringify({message:"",drafts:[{proposal:true,decision:"declined"}]})};
    assert.equal(confirmationCaption(message, previousTurn), "Không dùng LOOP, để trợ lý AI tự thực hiện");
    assert.equal(confirmationCaption(message, {role:"assistant",content:"ordinary text"}), "");
    globalThis.fetch = async () => ({ok:false,status:503,json:async()=>({})});
    await assert.rejects(api("/fixture"), {message:"Yêu cầu thất bại (HTTP 503)",status:503});
    globalThis.fetch = async () => ({ok:false,status:400,json:async()=>({error:"raw diagnostic"})});
    await assert.rejects(api("/fixture"), {message:"raw diagnostic",status:400});
    for (const lang of ["zh","en"]) {
      localStorage.setItem("loopforge.lang",lang);
      assert.equal(formatElapsed(3661),"1小时1分钟1秒");
      assert.equal(artifactSourceLabel("交付物"),lang === "en" ? "Deliverable" : "交付物");
    }
  } finally {
    globalThis.fetch=oldFetch;
    if(previous===null)localStorage.removeItem("loopforge.lang");else localStorage.setItem("loopforge.lang",previous);
  }
});
