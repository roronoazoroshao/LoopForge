import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../../web/app/'+file, import.meta.url), 'utf8');
const mcp = read('mcp.js');
const obs = read('observability.js');
const source = mcp.slice(mcp.indexOf('function mcpScopeDescription'),mcp.indexOf('function renderMCPManagement')) + obs.slice(obs.indexOf('function obsUi('),obs.indexOf('function obsFilterBar'));
for (const [lang,fn,args,expected] of [
  [
    "vi",
    "mcpScopeDescription",
    [
      false,
      "Dự án <&>"
    ],
    "Được thêm vào dự án “Dự án <&>”; không xuất hiện ở dự án khác."
  ],
  [
    "vi",
    "mcpScopeDescription",
    [
      true,
      "Người dùng"
    ],
    "Chỉ Người dùng có thể xem."
  ],
  [
    "vi",
    "mcpEmptyDescription",
    [
      false
    ],
    "Nhấp “Thêm MCP” ở góc trên bên phải để kết nối công cụ cho dự án này."
  ],
  [
    "vi",
    "mcpEmptyDescription",
    [
      true
    ],
    "Nhấp “Thêm MCP” ở góc trên bên phải để tạo cấu hình cá nhân."
  ],
  [
    "zh",
    "mcpScopeDescription",
    [
      false,
      "项目"
    ],
    "添加到「项目」，不会出现在其他项目中。"
  ],
  [
    "en",
    "mcpEmptyDescription",
    [
      false
    ],
    "点击右上角「添加 MCP」，为本项目接入工具。"
  ],
  [
    "vi",
    "obsScopeChipText",
    [
      "user",
      "Dự án <&>",
      "alice"
    ],
    "Dự án “Dự án <&>” · Lượt thực thi do alice phụ trách"
  ],
  [
    "vi",
    "obsScopeChipText",
    [
      "project",
      "Dự án"
    ],
    "Mọi thành viên của dự án “Dự án”"
  ],
  [
    "vi",
    "obsScopeChipText",
    [
      "user",
      "Dự án"
    ],
    "Dự án “Dự án” · Mọi thành viên"
  ],
  [
    "zh",
    "obsScopeChipText",
    [
      "user",
      "项目",
      "alice"
    ],
    "「项目」项目内 · alice 负责的执行"
  ]
]) test(`dynamic localization: ${lang} ${fn} ${JSON.stringify(args)}`,()=>{
  const context = vm.createContext({window:{lfLang:()=>lang}});
  vm.runInContext(source,context);
  assert.equal(context[fn](...args),expected);
});
