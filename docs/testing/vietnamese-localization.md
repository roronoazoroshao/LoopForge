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
