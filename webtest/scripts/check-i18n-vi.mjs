// Run with --strict to gate a full Vietnamese release. No network or credentials needed.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
for (const f of ['i18n-en.js', 'i18n-vi.js']) {
  vm.runInContext(readFileSync(new URL('../../web/' + f, import.meta.url), 'utf8'), context, { filename: f });
}
const { LF_I18N_EN: source, LF_I18N_VI: vi } = context.window;
const missing = Object.keys(source).filter(key => !Object.hasOwn(vi, key) || !vi[key]?.trim());
const unknown = Object.keys(vi).filter(key => !Object.hasOwn(source, key));
const total = Object.keys(source).length;
const tokens = value => value.match(/\$\{[^}]+\}|\{\{[^}]+\}\}|%[sdif]|\$\d+|\n|\\n/g) || [];
const tokenMismatches = Object.keys(source).filter(key => !missing.includes(key) && JSON.stringify(tokens(source[key])) !== JSON.stringify(tokens(vi[key])));
console.log(JSON.stringify({ total, translated: total - missing.length, missing: missing.length, unknown: unknown.length, tokenMismatches: tokenMismatches.length, coverage: ((total - missing.length) / total * 100).toFixed(2) + '%', missingKeys: missing, tokenMismatchKeys: tokenMismatches }, null, 2));
if (unknown.length || tokenMismatches.length || (process.argv.includes('--strict') && missing.length)) process.exitCode = 1;
