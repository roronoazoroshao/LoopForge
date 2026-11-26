import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evidenceGate} from '../reviews/evidence-gate.mjs';
const revision="bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d";
const cases=[{"id":"case-a","critical":true}];
const fixtures=[
  [
    "reject empty evidence",
    [],
    false
  ],
  [
    "reject missing guided result",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "baseline-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject self review",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "run-1",
        "reviewerId": "subject",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "run-2",
        "reviewerId": "subject",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "valid matched evidence",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    true
  ],
  [
    "reject guided failure",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject stale revision",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "ffffffffffffffffffffffffffffffffffffffff"
      }
    ],
    false
  ],
  [
    "reject duplicate arm",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject missing trace",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject shared run ID",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-1",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject shared trace hash",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject unrecognized case",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "fail",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "unknown",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ],
  [
    "reject baseline abstention",
    [
      {
        "caseId": "case-a",
        "arm": "baseline",
        "subjectRun": "run-1",
        "reviewerRun": "judge-1",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "reviewSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "verdict": "unverified",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      },
      {
        "caseId": "case-a",
        "arm": "guided",
        "subjectRun": "run-2",
        "reviewerRun": "judge-2",
        "reviewerId": "judge",
        "subjectId": "subject",
        "traceSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reviewSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "verdict": "pass",
        "sourceRevision": "bfb02394dd8d78dcfaef8ce79ff1801dfe67e46d"
      }
    ],
    false
  ]
];
for(const [name,records,want] of fixtures)test(name,()=>assert.equal(evidenceGate(cases,records,revision).eligibleForHumanReview,want));
