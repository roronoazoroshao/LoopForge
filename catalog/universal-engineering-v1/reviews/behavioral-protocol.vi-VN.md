# Kiểm thử hành vi và hội đồng — chưa chạy model

154 tài nguyên/mục tiêu; 308 ca thử (2 ca/tài nguyên). Mỗi ca cần 2 arm (baseline/guided) = 616 records thực. Đây là test spec, KHÔNG phải 616 kết quả. Matrix ghi expected riêng, chỉ đưa scenario và tài nguyên vào subject, không đưa expected; baseline không nạp riêng tài nguyên đang thử, guided nạp đúng version. Giữ fixture/model/tool policy tương đương, dùng workspace cô lập, synthetic data, không production/secret. Với workflow cần chạy engine thật, với marketplace phải có package đúng version, bytes, quyền và audit trước khi guided. Chạy lặp ít nhất 5 lần đối với hành vi nhạy cảm trước chứng nhận; bộ gate tối thiểu này không thay yêu cầu lặp hay score rubric.

## Evidence collection
- Mỗi run giữ prompt/input, tool events, artifact, output, exit code và exact candidate SHA; redact synthetic/real secret. Lưu trace JSON theo tên SHA256 của bytes. Reviewer độc lập (phiên/identity khác, không được xem nhãn arm nếu có thể) đọc trace và expected, viết verdict PASS/FAIL có evidence cụ thể. Lưu review JSON theo SHA256; người kiểm tra xác thực identity và provenance ngoài script.
- records.json là array: {caseId, arm: 'baseline'|'guided', subjectRun, reviewerRun, subjectId, reviewerId, traceSha256, reviewSha256, verdict:'pass'|'fail', sourceRevision}. Không tạo fixture giả làm kết quả thật. Baseline có thể pass; không được ép fail. Khi baseline pass, không được tuyên bố improvement.
- `node --test catalog/universal-engineering-v1/tests/evidence-gate.test.mjs`
- `node catalog/universal-engineering-v1/reviews/check-evidence.mjs records.json evidence-dir <exact-candidate-sha>`
- Gate kiểm đủ record, distinct IDs, hashes, revision và guided pass; KHÔNG chứng minh độc lập hoặc tính thật của nội dung trace. Reviewer/human xác nhận provenance, rubric ≥95, zero High/Critical và ký quyết định. Kết quả script không tự certify hoặc publish. Không ghi raw trace chứa bí mật vào GitHub.

## Council packets
Mỗi resource đã có domain reviewers, source locator, 2 cases, trạng thái pending trong resource-matrix.json. Reviewer phải ghi findings theo resource ID và source revision. Domain-expert: accuracy, completeness and execution; agent-systems: scope, prompt conflict, handoff; security/licensing: trust, permissions, supply-chain; QA: evidence and negative cases; architecture: dependency and failure; human owner: approval. Không tự gán điểm hoặc chữ ký cho chuyên gia.

## Status
Không có LoopForge endpoint / Runner / credentials và không có subagent độc lập được cung cấp trong phiên này; không chạy model behavioral tests. GitHub và SkillHub API DNS không hoạt động trong container, web fetch API cũng không khả dụng. Không có SkillHub package tải về hay cài. PR vẫn draft.
