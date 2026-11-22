# Kiến trúc

Nền tảng giữ tên Go module upstream `agentflow`, các ranh giới package và biến môi trường `AGENTFLOW_` để giảm xung đột hợp nhất về sau.

| Thư mục | Trách nhiệm |
| --- | --- |
| `cmd/agentflow` | Tiến trình API, worker hoặc kết hợp |
| `cmd/agentflow-runner` | Máy thực thi cá nhân và nhóm máy |
| `cmd/agentflow-mcp`, `cmd/agentflow-gate-mcp` | MCP công khai và kết quả điểm kiểm soát có cấu trúc |
| `internal/engine` | Đồ thị SOP, lease, điều phối lịch, vòng đời sandbox và bàn giao. Các nhánh sẵn sàng chạy đồng thời trong không gian lượt chạy; chạy lại một nhánh sau khi hủy sẽ khôi phục các nhánh cùng cấp đã bị hủy |
| `internal/repo` | Lưu trữ bền vững MySQL, một repository cho mỗi miền nghiệp vụ |
| `internal/httpapi` | Handler HTTP/MCP, một handler cho mỗi miền nghiệp vụ |
| `internal/runtime`, `internal/runner` | Giao thức trình thực thi, thông tin xác thực, cô lập và sản phẩm đầu ra |
| `internal/tracker` | Adapter Issue/PR từ xa |
| `web` | Giao diện web upstream được nhúng, tùy chọn và đăng nhập công khai |
| `migrations` | Di chuyển dữ liệu rõ ràng và danh mục công khai tùy chọn |
| `local` | Quy trình cục bộ và tích hợp host; hướng dẫn sử dụng nằm trong `docs/local/` |

Phiên bản công khai bổ sung đăng nhập tài khoản/mật khẩu và adapter GitHub. Những phần này dùng các hợp đồng người dùng, token, kho mã và bàn giao hiện có; không có bộ máy thực thi công khai riêng hoặc kho production trong bộ nhớ. Định danh kho mã từ xa bắt đầu bằng `github:` phân biệt tên owner/repository GitHub với định danh tracker phiên bản cũ. Trường JSON upstream `gongfengProjectId` mang định danh này để tương thích.

Tài nguyên quy trình CLI Classic và Portable được giữ riêng với nhau và với định nghĩa vai trò trên nền tảng. Chia sẻ hợp đồng hành vi tốt hơn sao chép tài nguyên runtime. Worker nền tảng không cần gói host Classic.
