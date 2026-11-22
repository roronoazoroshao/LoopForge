# LoopForge Vietnamese source localization — handoff (2026-11-22)

## Objective and non-negotiable scope
Finish high-quality VI localization for all **actually rendered** Web UI, React chatbot UI, state/status/error messages and source-generated strings, targeting **at least 99% measured end-user UI coverage**, not just dictionary parity. Preserve user names, project names, files, prompts, logs, IDs, API contracts, permissions and credentials. No fake claims of completion. User temporarily deferred the full runner/build/E2E; this is a **verification debt**, not a waived release gate.

## Repo, branch, PR
- Repository: https://github.com/roronoazoroshao/LoopForge
- Working branch: `fix/vi-runtime-completeness`; draft PR: https://github.com/roronoazoroshao/LoopForge/pull/5; target `main`.
- Main baseline at start of work: `f646574683d32b6988e11609e98d1c7933976e78`.
- **HEAD MOVES**: other work may land on the same branch during handoff. Always fetch current branch HEAD and tree before modifying. Use a lease / expected SHA; do not force push. Do not merge until release gates are met.
- Latest checked immediate parent for this handoff slice: `b252fe889024a2ac4edce8453be875fd046b7370`. This is context, **not** a guarantee of latest HEAD.

## Architecture and work already performed
- Web translation layer: `web/boot.js` (language preference), `web/i18n.js` (DOM text/attribute translation), and `web/i18n-en.js`, `web/i18n-vi.js` (exact keys); `window.lfT(zh,en,vi)` or source-level `pwCopy` for dynamic strings. DOM translation intentionally skips `textarea`, `code`, `pre`, `.markdown-body`, user-authored content and `data-i18n-skip`.
- React chatbot: `chatbot/src/locale.js` (`chatT` and `chatLocale`); `chatbot/src/local-conversation-fixtures.vi.js` provides 12 translated demo conversations. The system also uses source-produced metadata and durations.
- Numerous source-level fixes already committed to this branch: project wizard, project deletion, notification templates, React metadata and local demos, approvals, SOP, Runner, standalone IDE/WeCom/Gongfeng auth pages, scheduling, SkillHub, ECharts/observability, Workbench, GitHub, and user-data protection. Recent work also covered editor/tool messages, Go API error maps and role title/status labels; confirm exact diff against HEAD rather than trusting this handoff.
- This handoff slice fixes the preview progress message inside a `.markdown-body` which DOM translation cannot see, plus approval counts/time and preserving name text while localizing quotation marks.
- Test and acceptance guidance: `AGENTS.md`, `docs/testing/vietnamese-localization.md`, `docs/testing/acceptance-matrix.md`, `webtest/tests/i18n-vi.test.mjs`, `web/project_wizard_test.js`, `chatbot/src/locale.js`.

## Current evidence and caveats
- In the latest parent inspected, EN/VI dictionaries both had 6,257 keys; this demonstrates parity only, **not UI coverage**. Source-level isolated JS syntax and behavior fixtures passed for many changed functions; many Node/Vitest regression files were authored but **full runner, build and browser E2E have NOT been run**.
- A naive Chinese-literal source grep is misleading: some source text belongs to ZH-only branches, internal AI prompts, log/regex classifiers, vendor icon animation notes, test fixtures or user data. Classify by **render path and active locale**, especially DOM-skip regions.
- Remaining must-audit surfaces: user-visible backend Go errors not in whole-message catalogues, runtime-generated strings injected into skipped elements, dynamic React data, vendor VS Code locale, 3-language fallbacks, a11y labels, typography at narrow widths, and all error/empty/loading states.
- Source-only string coverage is not a valid 99% release metric. For a defensible percentage, enumerate actual routes/states/roles, capture VI locale renderings in a browser with representative fixture data, exclude user content/system protocols, count VI vs unexpected untranslated UI, then review semantics manually. Add negative regression cases for unchanged user text and API contract data.

## Reusable continuation prompt
Bạn là kỹ sư cấp cao chịu trách nhiệm hoàn tất Việt hóa sản phẩm LoopForge. Làm việc trực tiếp trên repo `roronoazoroshao/LoopForge`, nhánh `fix/vi-runtime-completeness`, PR #5. Đầu tiên fetch HEAD + tree và diff mới nhất; tuyệt đối không force-push hoặc ghi đè commit đang có. Đọc `AGENTS.md`, `docs/testing/vietnamese-localization.md`, `docs/testing/acceptance-matrix.md` và handoff này. Tiếp tục rà soát từ các thành phần Web/React/Go còn sót, nhất là nội dung trong phần tử mà DOM translator bỏ qua, thông báo trạng thái động và lỗi server. Dùng RED/GREEN unit fixture trước khi sửa, giữ nguyên dữ liệu người dùng, tên dự án, URL, API, quyền, secret, ID và prompt kỹ thuật. Tách chữ giao diện ứng dụng ra khỏi dữ liệu do người dùng/server cung cấp. Commit liên tục bằng optimistic lease lên nhánh làm việc; không merge `main` khi chưa đạt gate. Theo yêu cầu hiện tại tạm skip full runner/build/browser nhưng nêu rõ phần chưa xác minh; khi được phép chạy lại thì thực hiện đầy đủ test, build, browser E2E, accessibility/responsive QA, review độc lập. **Không tuyên bố 99%** chỉ vì dictionary đủ khóa; phải có mẫu số kiểm kê UI thực tế và báo cáo số trường hợp còn sót.
