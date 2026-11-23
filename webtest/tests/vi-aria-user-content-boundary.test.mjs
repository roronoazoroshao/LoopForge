import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = file => readFileSync(new URL("../../web/" + file, import.meta.url), "utf8");
const i18n = read("i18n.js");
const assets = read("app/assets.js");
const issues = read("app/issues.js");

test("the attribute translator protects a source-localized aria label containing an exact dictionary collision", () => {
  const match = i18n.match(/function translateAttrs\(el\) \{[\s\S]*?\n  \}/);
  assert.ok(match, "translation function is present");
  const sandbox = {
    ATTRS: ["aria-label"],
    SKIP_SEL: "[data-i18n-skip]",
    DATA_SEL: "[data-i18n-data]",
    HAN: /[\u3400-\u9fff]/,
    translate: value => value.replace("规则", "Quy tắc"),
    translateExact: value => value.replace("规则", "Quy tắc"),
  };
  const translate = vm.runInNewContext(match[0] + "\ntranslateAttrs", sandbox);
  const element = protectedLabel => {
    const attrs = new Map([["aria-label", "Sửa quy tắc “规则”"]]);
    if (protectedLabel) attrs.set("data-i18n-aria-skip", "");
    return {
      tagName: "ARTICLE",
      closest: () => false,
      hasAttribute: name => attrs.has(name),
      getAttribute: name => attrs.get(name) ?? null,
      setAttribute: (name, value) => attrs.set(name, value),
    };
  };
  const protectedElement = element(true);
  translate(protectedElement);
  assert.equal(protectedElement.getAttribute("aria-label"), "Sửa quy tắc “规则”");
  const unprotectedElement = element(false);
  translate(unprotectedElement);
  assert.equal(unprotectedElement.getAttribute("aria-label"), "Sửa quy tắc “Quy tắc”");
});

test("asset cards localize the action while preserving user-owned names in accessible text", () => {
  const seedNames = assets.slice(assets.indexOf("const ASSET_SEED_NAMES="), assets.indexOf("function assetIsBuiltin("));
  const snippet = assets.slice(assets.indexOf("function assetCardHTML(a)"), assets.indexOf("function assetGridEmptyHTML()"));
  const card = vm.runInNewContext(seedNames + snippet + "\nassetCardHTML({id:'asset-1',name:'规则',description:'任务'})", {
    assetVI: () => true,
    state: { assetType: "rules" },
    assetUICopy: (_, vi) => vi,
    escapeHTML: value => String(value),
    assetUILabel: () => "quy tắc",
    assetKindLabel: () => "规则",
    catalogOwned: () => true,
    huiIcon: () => "",
    assetIconName: () => "gate",
    assetMetaHTML: () => "",
    assetStatusHTML: () => "",
  });
  assert.match(card, /data-i18n-aria-skip aria-label="Sửa quy tắc “规则”"/);
  assert.match(card, /<h3 data-i18n-skip>规则<\/h3>/);
  assert.match(card, /<p class="asset-card-desc" data-i18n-skip>任务<\/p>/);
});

test("issue repository selectors leave user names/branch names intact", () => {
  const source = issues.slice(issues.indexOf("function fillIssueRepositories("), issues.indexOf("function selectedIssueRepositoryIds("));
  const box = { innerHTML: "" };
  const state = { data: { projects: [{ id: "p", defaultRepositoryId: "r" }], repositories: [
    {id:"r",projectId:"p",name:"规则",defaultBranch:"项目"}
  ] } };
  const fill = vm.runInNewContext(source + "\nfillIssueRepositories", {
    $: id => id === "#issueRepoChecks" ? box : null,
    state,
    escapeHTML: value => String(value),
    issuesVI: () => true,
    issuesCopy: (_, vi) => vi,
  });
  fill("p");
  assert.match(box.innerHTML, /<span data-i18n-skip>规则 · 项目 \(mặc định\)<\/span>/);
  assert.match(issues, /<option value="\$\{p\.id\}" data-i18n-skip>/);
  assert.match(issues, /<option value="\$\{w\.id\}" data-i18n-skip>/);
  assert.match(issues, /<span data-i18n-skip>\$\{escapeHTML\(repo\.name\)\}<\/span>/);
  assert.match(issues, /Nhánh phát triển tiếp của/);
  assert.match(issues, /Để trống để tạo nhánh từ nhánh chính/);
});
