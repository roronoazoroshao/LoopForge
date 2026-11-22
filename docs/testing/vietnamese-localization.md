# Vietnamese localization release checklist / Điều kiện phát hành tiếng Việt

This branch is an **incomplete preview**, not a complete Vietnamese release. Source baseline: `a458320ec989c9dbc08a3c4987a63498ff2c87d2`.

## Current evidence

- The English runtime catalogue contains 4615 distinct source keys. The Vietnamese catalogue contains 535 keys (11.59%); 4080 keys still fall back to English. This measures catalogue entries, not UI or semantic coverage.
- Preview selection uses the existing `loopforge.lang` storage preference; the document language is `vi-VN`. Existing Chinese and English preferences remain supported.
- The React workbench uses explicit UI string translations. Agent prompts, user data, identifiers, filenames and API contracts must not be automatically rewritten.
- Eleven Vietnamese Markdown translations exist, including the README, contribution and security policies, deployment guide, architecture, four Local guides, API overview and shared-schedules API guide. Other linked API and technical documents remain untranslated.
- Four localized README SVGs exist (hero and SOP flow, light and dark). Screenshots and videos retain their source languages; visual QA is not yet complete.
- Isolated JavaScript smoke checks of boot, language selection, translation fallback mechanism and existing locale behavior were performed. The complete CI suites, real browser visual checks and independent human expert review have **not** been verified.

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

The strict catalogue check is intentionally expected to fail for this preview until all missing keys have been translated. Passing it is necessary, not sufficient, for declaring the entire application localized.
