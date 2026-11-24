# Universal Engineering Pack — candidate v0.1.0

Bản nháp dữ liệu cho LoopForge v0.4.2, baseline 33a21a24d4de013820f5b2d023ca0bd01a84ac90. Không tự động seed, cài, chia sẻ, publish hoặc chạy. Không sửa engine, DB hay CI. 104 tài nguyên tự biên soạn, 50 năng lực SkillHub mục tiêu (5 lead có trang công khai, 0 gói tải/pin/audit/cài). Chưa được hội đồng độc lập phê duyệt.

## Dùng thử có kiểm soát
1. Chạy `node catalog/universal-engineering-v1/tests/validate.mjs` từ root. Dùng staging có tài khoản và sandbox riêng; không dùng production.
2. Tạo dự án thư viện trung tâm. Tạo ZIP capability pack bằng `python3 catalog/universal-engineering-v1/export.py <thư mục output mới>` rồi dùng preflight/import của platform. Kiểm tra ID xung đột và nội dung trước khi xác nhận.
3. Import role-pack.json sau Rules/Skills; executor/model để trống, xác minh hệ thống cho phép kế thừa cấu hình người phụ trách trên instance.
4. SOP và pipeline JSON là payload dự thảo, không phải pack import được hỗ trợ. Kiểm tra API PUT /api/workflows, gán projectId và sandbox hợp lệ, import SOP trước pipeline. Không ghi đè ID có sẵn; API PUT là upsert, không atomic. Chỉ dùng instance thử nghiệm và một writer.
5. Chạy các tình huống trong reviews/acceptance.md; không dùng riêng validator để công bố runtime ready. Chỉ publish/share sau khi kiểm quyền và được phê duyệt. Rules/Skills phải share trước Role; test cross-project. Không có credential, MCP, hook hay script node trong pack.

## SkillHub
Dùng marketplace API /api/skillhub/skills, detail/versions/files/file/evaluation và POST /api/skillhub/install với namespace, slug, version, projectId, id. Các lead trong skillhub/targets.json chỉ là ứng viên tìm kiếm, chưa xác minh version/license/hash hay nội dung. Không cài latest ngầm, không tự cập nhật, không trộn SkillHub Source với core skills. Sau review file và license, pin version và kiểm checksum của snapshot thật, cài private staging, kiểm hành vi rồi mới share.

## Giới hạn
SOP generic template hiện tại dùng seed SQL riêng; pack này không đổi seed và chưa tự động trở thành template. Chưa kiểm chứng nested SOP, artifact propagation, agent loop/approval execution, reject path, runtime model inheritance hay cross-project auth. Các profile là policy hướng dẫn, không phải loại entity runtime. Không có auto-deploy. Không tự xưng review độc lập.
