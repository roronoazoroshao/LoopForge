# SkillHub curation — quarantine ledger

Source docs: https://github.com/Tencent/skillhub/blob/main/docs/api/README.md and https://github.com/Tencent/skillhub/blob/main/README_EN.md. Public listing evidence is a lead, not a snapshot. Each target has a search query; 18 have indexed public leads, 4 have observed version labels (not verified byte pins); other targets need search. Some leads are adjacent/specialized and must be replaced if scope mismatch. All 50 remain pending; 0 verified downloads, hashes, licenses or installations.

## Per-target procedure on a network-enabled isolated workstation
1. Query official SkillHub API (list, detail, versions), choose namespace + slug + exact immutable version; inspect latest vs selected, reject ambiguous namespace and license gaps. Preserve author and original URL.
2. Download official ZIP for chosen version only; do not execute anything. Record SHA256 and platform signature verification if available. Inventory all entries; reject path traversal, symlink, suspicious binaries, oversized/duplicate files. Read every file, dependency and script; analyze prompt injection, secret access, egress and permissions. Signature does not establish safety.
3. Review relevance to capability, scope overlap, license redistribution/translation permission, and behavioral tests on synthetic fixtures. Use independent reviewer evidence. No auto-update or run.
4. Only after approval, use actual LoopForge POST /api/skillhub/install in staging with explicit namespace, slug, version, projectId, id. Compare installed snapshot to reviewed snapshot, record provenance, and run negative cases; share only after cross-project authorization test. Never overwrite existing ID. Role binding is separate after approval.

Container DNS failed for api.skillhub.cn and github.com; web API fetch failed too. No credentials/instance provided. No binary files redistributed. Registry keeps observedVersion separate from version (verified pin), and installed=false.

## Offline integrity gate
Save the independently authenticated exact-version `/api/v1/skills/{slug}/files` response and ZIP. Run `python3 audit_zip.py package.zip files.json --version 1.0.0` from this directory (replace 1.0.0 with actual selected version). This is intentionally strict: root SKILL.md, regular entries, no ambiguous paths, bounded sizes, full file SHA256/size equality and explicit version. A valid result remains quarantined; the tool does not authenticate the API response, verify licensing, inspect semantic behavior, download, extract or install. Run `python3 -m unittest -v test_audit_zip.py` in this directory. 13 synthetic fixture tests executed locally; no real package bytes tested.
