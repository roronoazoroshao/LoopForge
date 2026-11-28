# LoopForge Local: Classic / Portable

LoopForge Local tích hợp hai bộ quy trình, mã nguồn nằm trong `local/`. Để tránh cùng một host tải đồng thời hai bộ quy trình và xảy ra xung đột trạng thái, sản phẩm đầu ra, trình cài đặt chỉ cho phép một edition cho cùng một host trong mỗi dự án; dùng `install --force` khi cần chuyển đổi. Sự phân biệt này là hợp đồng phát hành, không phải sao chép thêm một lớp tệp runtime.

| Edition | Nguồn chuẩn trong kho mã | Điểm vào | Cách bảo trì |
| --- | --- | --- | --- |
| Portable | `skills/` | CodeBuddy/Cursor/Claude/DeepSeek Harness/Hermes dùng `/devflow`, Codex dùng `$devflow`, Pi dùng `/skill:devflow` | Sửa Skill chuẩn và manifest adapter |
| Classic (mặc định) | `.codebuddy/`, `.codex/`, `.cursor/`, `.claude/` | CodeBuddy/Cursor/Claude dùng `/start-devflow`, Codex dùng `$devflow-codex` | Dùng `.codebuddy` làm hành vi tham chiếu; Cursor/Claude do trình sinh tạo |

Các đường dẫn trong bảng đều tương đối với `local/`. Trình cài đặt cài tài nguyên tương ứng vào thư mục gốc của host trong dự án đích, ví dụ `.codebuddy/` hoặc `.agents/skills/`. Hãy chạy lệnh cài đặt trong dự án đích cần dùng quy trình; clone kho mã nền tảng LoopForge không tự động bật quy trình cục bộ.

## Xác nhận trước khi cài đặt

```bash
loopforge editions
loopforge plan claude
loopforge plan claude --edition portable
loopforge skills install claude
```

`plan` chỉ đọc tài nguyên cài đặt, không sửa dự án đích. Sau khi cài thực tế, edition và digest của từng tệp do trình cài quản lý được ghi trong `.devflow/install-state.json` của dự án.

Adapter Pi của Portable có tính khai báo: `skills install pi` chỉ cài `.pi/skills/`. Chế độ isolated (medium/large) còn cần tiện ích mở rộng công khai `pi install npm:pi-subagents` để cung cấp công cụ `subagent`.

DeepSeek Harness dùng `skills install dsh` để cài vào `.dsh/skills/`. DSH base profile mặc định cung cấp công cụ `subagent`; nếu profile hiện tại thiếu công cụ này, plugin ghi lý do cụ thể và hạ cấp luồng medium/large về `single-context`, không giả lập trình thực thi isolated.

Hermes Agent dùng `skills install hermes` để cài vào `.hermes/skills/` của dự án. Khi lần đầu phát hiện skill dự án, Hermes yêu cầu tin cậy kho mã một cách rõ ràng: chạy `hermes skills trust .` tại thư mục gốc dự án. Giai đoạn medium/large dùng `delegate_task` của Hermes để tạo tác tử phụ độc lập; khi phiên hiện tại thiếu công cụ, phải ghi lý do và hạ cấp xuống `single-context`. Nếu cần xem độc lập trạng thái, sản phẩm đầu ra và phê duyệt, có thể tùy chọn cài `local/hermes-plugin/`; plugin chỉ gọi `workflow_state.py` trong dự án, không ghi đè cấu hình profile Hermes.
