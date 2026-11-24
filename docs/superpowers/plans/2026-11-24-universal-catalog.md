# Universal Catalog Implementation Plan

> **For agentic workers:** use superpowers:executing-plans or subagent-driven-development; verify each task before proceeding.

**Goal:** deliver a shared, portable LoopForge engineering catalog. **Architecture:** explicit project-owned catalog, draft workflow payloads, native Role/Capability pack interfaces and marketplace install via pinned version; no new production seed until approved. **Tech stack:** LoopForge v0.4.2, JSON/Markdown, Node structural validation, Python export. **Spec:** catalog/universal-engineering-v1/README.vi-VN.md and approved conversation scope.

## Global constraints
No secrets, no provider hardcode, no default broad permissions, no destructive actions or auto deployment. No claimed independent review without independent evidence. Do not merge unverified catalog as certified. No overwrite existing IDs.

## Review focus
Missing references, unsafe paths, duplicate IDs, unapproved marketplace status, invalid reject targets, partial import and nested workflow failures. Structural tests cover first five; actual API and runtime tests remain pending.

- [x] Wave 0 schema inspection: domain/agent.go, domain/workflow.go, skillhub_market.go, role-pack.js and generic seed.
- [x] Wave 1 draft 24 rules and 16 skills, rubric.
- [ ] Wave 2 actual marketplace 50 snapshots, versions, license, checksums, review and staging installation (target registry only).
- [x] Wave 3 draft 32 roles; no provider binding.
- [x] Wave 4 draft 24 SOPs.
- [x] Wave 5 draft 8 pipelines and four profile policies.
- [ ] Wave 6 independent council review and behavioral test per resource; execute actual importer and negative tests on staging.
- [ ] Wave 7 CI exact HEAD, cross-project adoption, verified release, merge after gates.

Run `node catalog/universal-engineering-v1/tests/validate.mjs` and export with Python; then actual LoopForge staging tests. No review or release certification inferred from structural checks.
