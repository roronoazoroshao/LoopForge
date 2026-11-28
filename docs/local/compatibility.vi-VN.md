# Tương thích tác tử và kiểm chứng

Tài liệu này dành cho LoopForge Local; đường dẫn mã nguồn và các lệnh phát triển đều bắt đầu từ `local/`.

## Phạm vi hỗ trợ

| Host | Classic | Portable |
| --- | --- | --- |
| CodeBuddy | Gói đầy đủ `.codebuddy/` | `.codebuddy/skills/devflow` + adapter Team |
| Codex | `.codex/` + `.agents/skills` | `.agents/skills/devflow` |
| Cursor | Gói đầy đủ `.cursor/` | `.cursor/skills` + hai trình thực thi |
| Claude Code | Gói đầy đủ `.claude/` | `.claude/skills` + hai trình thực thi |
| Pi | Không (chỉ Portable) | `.pi/skills` + adapter `subagent` (cần `npm:pi-subagents`) |
| DeepSeek Harness | Không (chỉ Portable) | `.dsh/skills` + adapter `subagent` (DSH base cung cấp mặc định) |
| Hermes Agent | Không (chỉ Portable) | `.hermes/skills` + adapter `delegate_task`; lần đầu cần `hermes skills trust .`; tùy chọn `hermes-plugin/` cung cấp lệnh điều khiển `/loopforge` |

Thư mục Cursor/Claude của Classic là tài nguyên được sinh; nguồn chuẩn Portable chỉ lưu trong `skills/`. Hai edition chỉ chia sẻ các hợp đồng hành vi và kiểm thử rõ ràng, không chia sẻ tệp runtime host.

## Các tầng kiểm chứng

1. **Điểm kiểm soát cấu trúc:** kiểm tra JSON/YAML, Skill frontmatter, tham chiếu manifest và liên kết.
2. **Điểm kiểm soát sai lệch:** `build-classic-hosts.py --check` so sánh từng byte gói Classic được sinh.
3. **Điểm kiểm soát cài đặt:** CLI thống nhất bao phủ 7 host × 2 edition (Pi, DSH và Hermes chỉ Portable), đồng thời kiểm chứng cài lặp lại, cập nhật, gỡ cài, từ chối trộn edition và bảo vệ tệp người dùng.
4. **Hồi quy quy trình:** kiểm thử đơn vị bằng thư viện chuẩn và E2E CLI kiểm chứng máy trạng thái, điểm kiểm soát, sản phẩm đầu ra và giao thức khôi phục.
5. **Canary trên host thật:** trước phát hành hoặc sau nâng cấp phiên bản lớn của host, trong kho fixture cô lập, chạy một quy trình small và một quy trình medium bằng CLI Cursor/Claude/Codex/CodeBuddy thực; lưu phiên bản host, dấu vết gọi, trạng thái cuối và diff. Tầng này cần thông tin xác thực và môi trường runtime của từng host, không được giả vờ là kiểm thử đơn vị thông thường không cần thông tin xác thực.

Hermes và DSH không gắn với phiên bản riêng tư: phiên bản ổn định hiện tại và phiên bản sau phải cung cấp các năng lực công khai nêu trong manifest. Khi thiếu năng lực, Hermes không được giả lập trình thực thi isolated; DSH/Hermes phải ghi lý do và hạ cấp về `single-context` theo hợp đồng adapter. Chính sách năng lực này chính là ranh giới phiên bản.

Bốn tầng đầu chạy trong CI PR thông thường. Tầng thứ năm nên dùng pipeline thủ công hoặc theo lịch được bảo vệ; mọi thay đổi host cần cập nhật thông tin đối chiếu manifest trước rồi chạy canary. Nếu canary host thất bại, không chỉ cập nhật snapshot mà cần xác định trước đó là thay đổi giao thức trường dữ liệu, thiếu công cụ, thay đổi quyền hay hồi quy hành vi mô hình.

## Các bước cập nhật

1. Xác định thay đổi thuộc Classic, Portable hay hợp đồng hành vi dùng chung.
2. Với Classic, chạy `python3 scripts/build-classic-hosts.py --write`; với Portable chỉ sửa `skills/`.
3. Chạy `bash scripts/validate.sh`, `bash scripts/smoke-install.sh` và quét bí mật.
4. Nếu thay đổi liên quan trường dữ liệu host, điều phối hoặc vòng đời, đối chiếu tài liệu chính thức và thực thi canary host thật.
5. Trong PR liệt kê `passed`, `failed`, `blocked` hoặc `not-run` cho từng host; không dùng kết quả đạt của một host để đại diện tất cả.
