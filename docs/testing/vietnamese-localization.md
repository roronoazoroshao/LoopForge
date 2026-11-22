# Vietnamese localization release checklist / Điều kiện phát hành tiếng Việt

The merged Vietnamese localization is an **incomplete preview**, not a complete Vietnamese release. Source baseline: `a458320ec989c9dbc08a3c4987a63498ff2c87d2`.

## Current evidence

- The English runtime catalogue contains 5330 distinct source keys. The Vietnamese catalogue contains all 5330 source keys (100% key coverage, zero missing, empty, or unknown keys). This measures catalogue entries, not UI or semantic coverage.
- Preview selection uses the existing `loopforge.lang` storage preference; the document language is `vi-VN`. Existing Chinese and English preferences remain supported.
- The React workbench uses explicit UI string translations. Agent prompts, user data, identifiers, filenames and API contracts must not be automatically rewritten.
- Fifteen Vietnamese Markdown translations exist, including the README, contribution and security policies, deployment guide, architecture, four Local guides and all six API index/detail documents. Other technical documents remain untranslated.
- Four localized README SVGs exist (hero and SOP flow, light and dark). Screenshots and videos retain their source languages; visual QA is not yet complete.
- Isolated JavaScript smoke checks of boot, language selection, fallback, existing locale behavior and nine Vietnamese dynamic formats were performed. Placeholder and newline comparisons found no remaining mismatches. Complete CI, browser visual checks and independent human expert review have **not** been verified.

## Screenshot-driven follow-up (2026-11-22)

- Added 715 previously uncatalogued keys from the console, including execution machines, projects, access keys, channels, capability assets, assistant settings, requirements, run details and usage analytics.
- Explicitly localized dynamic scope sentences in MCP and usage analytics and the chatbot machine-refresh action. Preserve project/user names, HTML escaping and existing command/API identifiers.
- Focused regression fixtures cover 60 previously untranslated labels, 10 dynamic scope scenarios, and the static HTML text/attribute inventory. These are not browser screenshots or a complete UI inventory.
- Full CI and real-browser QA remain outstanding. The owner's requested merge is a preview integration, not a production readiness approval.

## Completion gates

1. Fill every source catalogue key with reviewed Vietnamese copy.
2. Inventory source literals not covered by the existing catalogue: Web static and dynamic strings, React components, accessibility attributes, notifications, Go API error display, runner/CLI interfaces and built-in examples. Keep protocol codes and raw diagnostics intact.
3. Review translations by context, preserve placeholders, commands, IDs and URLs; never translate user-authored text or secrets.
4. Translate remaining API detail documents, technical guides and public-facing visual assets. Verify relative links, heading anchors and external URLs.
5. Run static catalogue completeness, Web tests, chatbot tests, Go tests and the public browser acceptance suite. Check screenshots in dark/light themes, narrow/wide viewports, keyboard navigation and language persistence on reload.
6. Obtain independent approvals from a Vietnamese technical editor, a platform/DevOps maintainer and a security reviewer. These must be actual reviewers, not AI role-play. Record findings and fixes in GitHub.
7. Merge only after all gates pass.

## Commands

```bash
node webtest/scripts/check-i18n-vi.mjs
node webtest/scripts/check-i18n-vi.mjs --strict
(cd webtest && npm ci && npm test)
(cd chatbot && npm ci && npm test)
bash scripts/build-chatbot.sh
go test -p=2 ./... -count=1 -timeout=180s
go vet ./...
python3 scripts/check-public.py
bash scripts/scan-secrets.sh
```

The strict catalogue check now passes on key coverage. Dynamic Vietnamese stage, round, date, quantity and severity formats also have focused regression tests. Passing it is necessary, not sufficient, for declaring the entire application localized.

## Source audit checkpoint — 2026-11-22

Baseline `f646574683d32b6988e11609e98d1c7933976e78`: 5,733 entries per EN/VI catalogue, verified by evaluating the original catalogues. Ten previously reported translation calls still returned Han text. The first implementation slice explicitly localizes project wizard copy and the recoverable project deletion flow; it protects already-localized dialog/toast text from the fragment observer. Scoped wizard wrapping rules are a candidate, not a visual QA result. Four focused source fixtures (three expected failures on baseline, four passes on the candidate) were evaluated in an isolated JavaScript fixture, not via the repository's full Node/jsdom runner. Full checkout, dependency installation, platform build, browser E2E, independent review and runtime-wide source ownership classification remain mandatory and unverified. Do not merge or advertise a complete Vietnamese release until those gates pass.

### React chat source audit (next slice)

Localized HTTP fallback, elapsed time, verified confirmation captions, display-only artifact source labels, local-preview generated replies/errors/branch title, and approval punctuation. Raw API diagnostics, action tokens, source metadata, names and existing stored conversations are not rewritten. The English chat preference still intentionally follows the existing Chinese path. Focused isolated JavaScript checks were run; the Vitest regression file is added but the repository runner, production build and browser execution are deferred. Existing preview conversation seed text and server-owned error classification remain open inventory items.

### Notification and execution source audit

Reviewed exact static labels on notification, approval, scheduling and credential screens. Localized new notification presets (never rewritten saved templates), preserved placeholder order and credential/log constraints, and explicitly localized selected durations and GitHub authorization messages. Isolated JavaScript syntax/catalogue/template-variable checks only; actual notification preview data from the server and DOM states still require source classification and browser checks.

### Local preview fixture source audit

All 12 fresh browser-local demo conversations now have Vietnamese titles, 48 messages and 12 activity labels. Locale selection occurs only when the existing preview creation path runs, never when loading previously stored conversations. IDs, roles, model IDs and three original demo artifact filenames remain unchanged. An isolated evaluation confirmed these invariants and absence of Han in Vietnamese demo prose (excluding preserved filenames); the added Vitest file has not been run via the full runner.

### Approval and issue detail dynamic source audit

Localized Web manual gate reasons, paused run descriptions, rework buttons and bulk messages, the issue close dialog and associated-conversation metadata, and run graph stage/parent copy. Preserved workflow/user names and instructions; marked localized prompt titles and messages to avoid a second DOM translation, and reset protection between dialogs. The original ZH/EN source branches and run API payload expressions remain unchanged. Isolated gate fixtures and JS syntax checks passed; full DOM and browser verification remains deferred.

### SOP designer and request-management source audit

Localized sandbox selection/failure messages using explicit Vietnamese arguments; prompt placeholder help, platform tab labels, SOP-copy suffix and destructive confirmation copy. Localized permanent issue deletion warnings and bulk counters; preserved force/external-sync distinctions and the original API path and request body. Added 91 reviewed static catalogue keys. Isolated source checks cover sandbox empty/selected behavior and four destructive-warning combinations; catalogue token parity verified; full runner/browser checks remain deferred.

### Canvas/SVG-only translation gap

ECharts labels and tooltip content are constructed outside standard Web UI nodes; DOM-only dictionary coverage was insufficient. Source-level Vietnamese labels now cover weekdays, phase legend, tooltip labels and period names. SkillHub fixes compact number units and generated quota warnings, preserving file paths and numerical limits. Isolated generated chart options and numeric warning checks passed. Full browser rendering and automated test suite remain deferred.

### Conversation Workbench, rooms, bots, composer and dashboard source audit

Localized Workbench relative-time labels, dynamic room SOP dispatch prompts, rework modal, bot test delivery and project names, TAPD creation feedback, issue owner fallback and option counts, and dashboard health metrics. Protected names and external IDs from second-pass DOM mutation in prelocalized messages. Isolated function checks passed; full runner/browser checks remain deferred.

### Static Web Workbench, bot and collaboration UI pass

Added 59 complete EN/VI catalogue entries covering accessible labels, bot setup, room workflows, Web Workbench states and conversation suggestions. The four predefined example prompts are translated at generation time (not merely in the DOM), so pressing them sends Vietnamese in Vietnamese mode and leaves the original Chinese strings for the other existing mode. Placeholder and catalogue parity checked by isolated execution. Full runner/browser checks remain deferred.

### Standalone routes

`/vscode.html`, `/bot-bind.html`, and `/gongfeng-oauth-done.html` previously omitted `boot.js` and the i18n runtime, so Web catalogue additions could not localize those routes. All three now load locale initialization, EN/VI catalogues and DOM translator in script order before their page scripts. Added 47 reviewed labels; account names and binding codes remain unchanged. Source-level script order checks pass, but Content Security Policy, iframe behavior, full VS Code vendor locale and real-browser checks remain unverified.

### Shared tasks and scheduled execution dynamics

Scheduled execution statuses now localize the authored prefix without modifying raw server diagnostics; pinned-conversation text and shared-subscription project scope are authored in Vietnamese before DOM rendering. Parameter metadata retains its technical identifiers and defaults while localizing required markers and counter labels. Isolated source evaluations checked Vietnamese, Chinese and raw-data preservation; full runner, preview API and browser remain unverified.

### Static scheduling and integration labels

Reviewed 51 additional EN/VI UI keys for scheduled execution, runtime operations, SkillHub, shared subscriptions, analytics and standalone status messages. Catalogue invariants were checked directly: zero empty/missing entries and no placeholder mismatch; this is not a claim of runtime-wide or semantic coverage.

### Runtime machinery, SOP KPI and revision source audit

Runner concurrency and default machine status, relative heartbeat time, update and removal confirmations, SOP catalogue metrics and project ownership, repository save feedback and revision history titles are explicitly authored in Vietnamese at source. Dynamic names, workflow and runner IDs, raw diagnostics and API payloads retain original meaning; protected prelocalized confirmations prevent second-pass mutation. Focused isolated checks confirmed Vietnamese Runner/metric copy and unchanged Chinese defaults; full tests and browser QA remain deferred.

### Observability ECharts funnel and dynamic categories

Translated five funnel-stage labels and category/source names at the producer before ECharts consumes them; translated dynamic peak, trace-source and tool-call labels while leaving raw trace identifiers and counts unchanged. Isolated source checks confirmed English-independent VI labels and unchanged ZH metric keys. Full ECharts browser tests are deferred.

### Observability generated insight sentences

Source-level VI branches now create complete delivery, token comparison, cache hit and failure-insight sentences including dynamic quantities and raw model names. The `data-i18n-skip` protection is applied only to prelocalized insight bodies, preventing the runtime observer from rewriting user-authored workflow names and diagnostic strings. A RED/GREEN isolated fixture exercised delivery insights and verified that ZH output is unchanged; the Node test file is authored but the runner is deferred.

### Broad UI literal inventory: high-priority leftovers

Added 66 reviewed source phrases from SSH host trust, accessible dropdowns, file upload, issue delivery, analytics explanatory text, and account registration. These came from a literal-level audit of first-party modules rather than assuming catalogue completeness. Internal SVG motion metadata and engine/system prompts are tracked separately as non-UI or behavior-sensitive text. Dictionary checks ensure every newly added EN key has a Vietnamese value and matching interpolation tokens; full runtime coverage not yet certified.

### Remaining first-party static Web copy

Reviewed and added 72 VI and EN entries spanning notification editor helper copy, SOP designer/scheduling, SkillHub version states, run execution details, IDE status and orchestrator error messages. Preserved project and protocol identifiers; static strings inside already explicit localized branches and agent prompt content are not counted as missing user-interface translations. Interpolation and dictionary parity were checked in isolation, but production rendering and semantic review are still pending.

### Upload raw data safety and localized validation

Source-localized upload labels, hints, overflow counts and validation errors in Vietnamese while leaving the Chinese branch unchanged. File-name nodes are tagged `data-i18n-skip` so an uploaded Chinese filename cannot be translated by the broad DOM observer; dynamic rejection messages are prelocalized and likewise protected. An isolated fake DOM fixture reproduced the old Chinese copy, checked localized VI and preserved original filenames. Full Node/browser tests remain deferred.

### SSH trust confirmation safety

Fixed SSH-host removal copy: Vietnamese dialogs now describe removal in Vietnamese while preserving the hostname verbatim, rather than falling back to English with a mixed-language raw host. The trust-fingerprint prompt uses the existing `messageLocalized` dialog boundary, protecting hostnames and server fingerprint lines from fragment translation. Added two success notices to EN/VI dictionaries. Isolated language fixtures confirmed VI, ZH and EN branches; no SSH keys, hosts, API parameters or fingerprint contents were rewritten.

### Project draft and repository deletion confirmations

Localized abandoning a project draft and deleting a linked repository at the dialog source. User-provided names are preserved by `messageLocalized`, and the repository warning retains its consequences: running SOPs continue, deletion cannot be undone, and deleting the default repository leaves no default. An isolated RED/GREEN fixture checked both VI and unchanged ZH confirmation copy; full DOM/browser checks remain deferred.

### Workbench raw-conversation data boundary

Protected user-authored chat bodies, sender names, conversation titles, file attachment names and model-generated replies from DOM fragment replacement. UI copy stays translatable outside those data spans; the path-scrubbing placeholder is authored in Vietnamese in VI mode, with original ZH behavior retained. A source-executed RED/GREEN fixture checked original Chinese messages and file names remain unchanged and path scrubbing still strips raw filesystem paths. Full React/Web/browser tests and vendor VS Code locale remain deferred.

### Narrow localization of API validation errors

Two stable Go issue-validation messages now have exact Vietnamese translations, and two SOP errors with variable identifiers are handled by strictly anchored Vietnamese-only display patterns. The underlying Go strings, API responses, identifiers, status codes and raw diagnostics remain unchanged. Isolated before/after fixtures passed for VI and verified zero output changes for EN and ZH; full test runner/browser validation remains deferred.

### SOP draft created toast

Localized the dynamic draft-creation result at its source, including dependency counts and exact known-key translations. Unrecognized labels remain intact; the VI toast is marked as already localized to prevent fragment rewriting. Isolated tests verified both VI and original ZH output. Full runner/browser verification remains deferred.

### SOP prerequisite prefix and repository drawer

Localized the dynamically concatenated “需要” prefix before SOP prerequisites as “Cần: ” while retaining technical and user labels. Added exact EN/VI catalogue entries for two previously untranslated repository-drawer states. Isolated RED/GREEN source fixtures confirmed VI, unchanged ZH and the dictionary entries. Full runner/browser checks remain deferred.

### React QuickAccessWizard — persistent fallback SOP localization

Previously a fresh Vietnamese onboarding flow localized only display names but persisted seven Chinese role names, descriptions and prompts, a Chinese sandbox, node names and SOP description. The provisioning path now stores reviewed Vietnamese content for newly generated fallback SOPs while keeping all agent/node/workflow IDs, artifact paths, `{{input}}` placeholders, tags, edges, model IDs and API payload structure invariant. Existing stored projects and user-owned SOP content are never migrated. An isolated source-executed RED/GREEN fixture compared seven roles and a workflow in VI and ZH; the Vitest/Node production runner and browser are still deferred.

### React accessibility and test reliability

Localized the previously hardcoded `SidebarSection` accessible label (“conversations of [title]”) while preserving the unmodified project title in both VI and ZH. Adjusted the isolated QuickAccess SOP provisioning regression test to await the actual async provisioning promise instead of waiting a single event-loop turn, avoiding timing-dependent false positives.

### React onboarding punctuation and source test reliability

QuickAccess Wizard model and CLI lists use a locale-aware separator (`、` in ZH, `, ` in VI); the interpolated repository-name caption now closes parentheses via `chatT` rather than a hardcoded Chinese glyph. Project names, model IDs and repository names remain unmodified. The fallback SOP regression test normalizes cross-VM-realm nested arrays before strict equality checks, avoiding failures caused solely by prototype identity. Isolated RED/GREEN separator fixture passed; production runner is deferred.

### React chatbot Git change statuses and tool-error fallback

The Changes panel now derives Vietnamese labels for Git porcelain codes A/M/D/R/C/U, while the source status code, file path and diff metadata remain untouched. Its missing-start tool-completion fallback now emits localized UI text in VI mode, without changing the tool event ID, failure flag or stream semantics. Focused source-level RED/GREEN fixtures verified VI and original ZH branches. Full runner/build/browser checks remain deferred.

### Chat metadata and personal-group labels

Localized the previously hardcoded personal-chat group title through `chatT` and the `已完成` artifact source marker through the display-only locale mapping. Persisted message-source marker and user-authored project names are unchanged. Isolated RED/GREEN source evaluations check both VI and ZH; full runner/browser QA remains deferred.

### Exact Go API error strings: projects, accounts, issues and schedules

Added 33 reviewed Vietnamese/English whole-message translations for user-visible project permissions, domain ownership, registration, TAPD validation, scheduling and shared-task access errors. Go handlers, status codes, machine-readable fields and existing data are unchanged. These exact entries prevent partial fragment translation such as mixed Owner/项目 text. Catalogue parity and template-variable invariants were evaluated in isolation; full API integration and runner tests remain deferred.

### Date picker and SOP palette

The date calendar produces Vietnamese weekday headings and month navigation directly (the legacy Chinese branch is unchanged); the option search uses Vietnamese accessible labels. Flow palette grouping, role metadata, SOP status and copy confirmations now author Vietnamese at render source, with user-provided workflow/role names excluded from a second DOM translation pass. Focused syntax and isolated locale fixtures passed; browser QA remains pending.

### SkillHub and shared subscription data boundary

Localized SkillHub filter/empty/error UI at source (including Vietnamese number formatting), and protected raw search terms, skill titles/descriptions, shared-task titles/source names and backend diagnostics from the DOM dictionary pass. User data and API payloads are preserved. RED/GREEN isolated empty-search fixtures and syntax checks passed; actual browser and runner checks remain deferred.

### React mention picker and fallback labels

Mention category and hint copy now uses explicit VI metadata while retaining stable API type values and user-provided reference names. The local workspace-file preview label, workspace-unavailable fallback, default conversation title, and attachment-only user prompt are generated in Vietnamese. Isolated JS fixtures checked VI/ZH output and unchanged reference identifiers; JSX code was reviewed without a full bundler, pending the deferred runner/E2E gates.

### Static HTML coverage audit

Reviewed static Chinese text nodes and attributes in the five standalone Web HTML pages through the actual i18n translator. Added exact Vietnamese/English coverage for canvas zoom/minimap tooltips, sandbox/discard hints, a shared-task parameter guide and the TAPD work-item placeholder. The language switch label `中文 / English / Tiếng Việt` intentionally remains multilingual. The audit only covers authored HTML literals, not dynamic rendering or browser behavior.

### MCP JSON import validation

Localized all importer-generated error explanations in the Vietnamese branch without rewriting field names, technical IDs, transport codes, user-supplied values, or credentials. Imported MCP names/descriptions and source-project names in cards are protected against the DOM translator. Selection prompts and import-result messages are composed before rendering. RED/GREEN isolated checks covered invalid maps, URL requirements, unchanged ZH errors and preserved headers; full repo test runner remains deferred.
