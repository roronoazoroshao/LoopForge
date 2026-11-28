import {chatT} from "./locale.js";
export const referenceTypes = [
  { type: "agent", label: "角色", hint: "派给角色去做" },
  { type: "skill", label: "技能", hint: "用这个技能来做" },
  { type: "issue", label: "需求", hint: "查找需求与验收条件" },
  { type: "sop", label: "LOOP", hint: "引用工作流程" },
  { type: "run", label: "运行", hint: "查看任务执行情况" },
  { type: "repository", label: "仓库", hint: "添加代码仓库上下文" },
];
// Localized display metadata; type identifiers remain part of the public reference protocol.
const referenceLabelsVI={
 agent:{label:"Vai trò",hint:"Giao tác vụ cho vai trò"},
 skill:{label:"Kỹ năng",hint:"Sử dụng kỹ năng này"},
 issue:{label:"Yêu cầu",hint:"Tìm yêu cầu và tiêu chí nghiệm thu"},
 sop:{label:"SOP",hint:"Tham chiếu quy trình làm việc"},
 run:{label:"Lượt chạy",hint:"Xem trạng thái thực thi tác vụ"},
 repository:{label:"Kho mã",hint:"Thêm ngữ cảnh kho mã"},
};
export function referenceTypeLabel(type){
 const item=referenceTypes.find(ref=>ref.type===type);
 return item?chatT(item.label,referenceLabelsVI[type]?.label??item.label):type;
}
export function referenceTypeHint(type){
 const item=referenceTypes.find(ref=>ref.type===type);
 return item?chatT(item.hint,referenceLabelsVI[type]?.hint??item.hint):"";
}
export function mentionAt(text, caret, references = []) {
  const before = text.slice(0, caret);
  const match = before.match(/@([^@\n]*)$/);
  if (!match || /[a-z0-9_.+-]/i.test(before[match.index - 1] || ""))
    return null;
  if (references.some((ref) => match[1].startsWith((ref.name || ref.id) + " ")))
    return null;
  return { start: match.index, end: caret, query: match[1] };
}
export function insertMention(text, range, reference) {
  const token = `@${reference.name || reference.id} `;
  return {
    text: text.slice(0, range.start) + token + text.slice(range.end),
    caret: range.start + token.length,
  };
}
