# Kiến trúc LoopForge Local

`local/` chứa hai hiện thực quy trình được phân tách rõ ràng và một mặt phẳng điều khiển cài đặt thống nhất. Các đường dẫn mã nguồn bên dưới đều tương đối với `local/`, các lệnh phát triển cũng chạy trong thư mục đó. Xem [kiến trúc tổng thể](../architecture.vi-VN.md) cho nền tảng.

## Classic Edition

`.codebuddy/` là hành vi tham chiếu và phần chính được bảo trì thủ công; `.codex/` là adapter Codex gốc hiện có; `.cursor/` và `.claude/` được sinh bởi `build-classic-hosts.py`. Cả bốn thư mục đều là gói host đầy đủ, không đọc `skills/devflow` làm nguồn runtime.

## Portable Edition

`skills/` cung cấp máy trạng thái DevFlow mới, mẫu, quy tắc, kiểm thử và adapter độc lập, hỗ trợ CodeBuddy, Codex, Cursor, Claude Code, Pi, DeepSeek Harness và Hermes Agent (Pi chỉ có adapter khai báo, chế độ isolated phụ thuộc tiện ích công khai `npm:pi-subagents`; DSH dùng công cụ `subagent` tích hợp; Hermes dùng `delegate_task`). Tập lệnh chỉ phụ thuộc thư viện chuẩn Python 3.8+; khả năng điều phối tác tử cụ thể do host cung cấp.

`skills/manifest.json` là manifest tập Skill xuyên host. `skills/` là nguồn chuẩn duy nhất của lớp này. Vai trò logic, sản phẩm đầu ra, quy tắc và năng lực host được quản lý bằng các manifest tương ứng; nội dung trình thực thi Portable dùng chung giữa Cursor và Claude Code chỉ giữ một bản. Chỉ khi cài Portable vào dự án đích mới sinh nội dung `.cursor/.claude/.agents/.codebuddy`, không được ghi đè ngược gói Classic trong kho mã.

Khi cài sang dự án khác, ưu tiên tạo liên kết tượng trưng tương đối. Nền tảng không dùng được liên kết tượng trưng có thể thêm `--copy-skills`; trình cài ghi lại các bản sao do nó quản lý, sau đó chỉ ghi đè chúng khi có `--refresh-managed` rõ ràng, không đụng đến Skill riêng của dự án.

## Mặt phẳng điều khiển cài đặt thống nhất

CLI `DevFlow` chịu trách nhiệm install, status, update, uninstall và doctor. Bốn target giữ lớp mỏng, lõi cài đặt xử lý thống nhất kế hoạch, kiểm tra xung đột, ghi trạng thái và bảo vệ tệp người dùng. Edition mặc định là Classic; `loopforge install <host>` cài gói host đầy đủ, Portable cài qua `loopforge skills install <host>`. Trình cài không thay đổi máy trạng thái nội bộ của hai quy trình.

## Công cụ tùy chọn và mở rộng riêng tư

`tools/` chứa công cụ bổ trợ không nằm trong gói cài Classic/Portable và gói npm `loopforge-cli`. Hiện `tools/tcmcp` là trình khởi tạo MCP chỉ đọc của Tencent Cloud, chạy riêng từ kho mã clone hoặc image GHCR.

Các năng lực CI/CD, phiếu công việc, lưu trữ mã doanh nghiệp, kho tri thức, thông báo trò chuyện và vận hành đám mây chưa công khai nên nằm trong kho riêng của bên triển khai, được bổ sung qua cấu hình cục bộ hoặc cài đặt có kiểm soát. Không đưa chính sách CAM, tên miền nội bộ hoặc MCP vận hành vào mẫu quy trình Classic/Portable.
