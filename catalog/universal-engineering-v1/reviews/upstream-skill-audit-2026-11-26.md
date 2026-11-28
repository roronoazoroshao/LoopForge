# Manual upstream Skill audit — 2026-11-26

Reviewed full source directories from [Tencent/skillhub@022aad9](https://github.com/Tencent/skillhub/tree/022aad9de39f75199bad0e2c3adf8be7791d68c8) plus MIT repository license: 16 files for find-skill-skillhub v1.0.2 and 12 files for skillhub-trace-evaluator v1.0.0. Source bytes are not proven identical to marketplace ZIPs. These are author-side manual findings, not independent expert approvals.

## find-skill-skillhub
Useful relevance workflow, but the install instructions lack mandatory namespace/version pin and include a direct remote shell installer. Same-name duplicate packages in the third-party snapshot demonstrate why identity must include publisher. Decision: hold as-is; use existing read-only ranking collector rather than automatically execute installation instructions.

## skillhub-trace-evaluator
Useful dimensions and explicit limitation: local TRACE does not perform security scan. Exact Python script Git blob `4fd0cf477db6e0b876620de026812c807c214aa6` verified before local execution (Python 3.13.5). Seven synthetic inputs tested by stdin. Invalid null dimensions is accepted (exit 0), violating schema requirement. Two further stricter LoopForge policy cases (scored skipped scan; non-skipped scan without evidence) are also accepted. Upstream deliberately supports platform-style scan score, so distinguish policy mismatch from bug. This validator cannot be a certification gate.

| Test | Expected (LoopForge) | Observed |
|---|---:|---:|
| valid report | 0 | 0 |
| null dimensions | 1 | 0 |
| missing dimensions | 1 | 1 |
| empty dimensions | 1 | 1 |
| skipped scan with score | 1 | 0 |
| non-skipped scan without evidence | 1 | 0 |
| missing reliability item | 1 | 1 |

Do not certify these two packages or any other package from source review alone. Actual SkillHub archive, file manifest, runtime and independent review remain separate. No unauthorized execution, no private data.
