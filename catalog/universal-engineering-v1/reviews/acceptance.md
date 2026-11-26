# Acceptance and council review — PENDING

All 104 authored resources and 50 marketplace capability targets remain DRAFT. No independent reviewers have signed. No score is assigned. A separate reviewer/session must evaluate each resource against its exact version, findings, behavioral evidence and permissions.

Rubric: accuracy 20; completeness 15; execution 20; security 15; reuse 10; verification 10; clarity 5; provenance 5. Threshold 95/100 AND zero unresolved high/critical findings. Independent human approval before certification. A score never overrides failed gates.

## Required checks
- Schema: actual LoopForge role importer and capability preflight; reject invalid IDs, duplicate IDs, missing reference, unauthorized writes and partial import failure. Verify export/import round-trip on staging.
- SkillHub: marketplace metadata, immutable version, package hash, license, file tree, suspicious script, prompt injection, negative test and provenance; no unreviewed redistribution. Compare actual installed snapshot hash; quarantine if uncertain.
- Runtime: each workflow entrypoint, success and failure, bounded rejection, upstream artifact integrity, nested SOP handoff, missing model/executor, missing sandbox, authz and project scope. Test repeated runs and resource collisions.
- Behavior: for each skill/role, run baseline without guidance then same scenario with guidance, including misleading success claims, malicious tool output, missing input, rework and unauthorized production action. Record raw traces; no simulated reviewer approvals.
- Five representative projects: Web/SaaS, API, Mobile, AI Agent and legacy. Record actual commands, revision, exit codes, screenshots when applicable, findings and reruns.
- Certification: separate architecture, software, prompt/agent, security, QA, SRE, adversarial and editorial review; evidence per resource; release authorization and rollback. Current status: pending.
