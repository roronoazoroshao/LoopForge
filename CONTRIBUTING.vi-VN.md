# Đóng góp

LoopForge có nền tảng ở thư mục gốc của kho mã và phiên bản quy trình cục bộ bổ trợ trong `local/`. Hãy đọc `AGENTS.md` tương ứng trước khi thay đổi một trong hai phần.

Đối với thay đổi nền tảng, giữ nguyên ranh giới giữa bộ máy thực thi, lớp repository và lớp handler của upstream. Tách biệt rõ các phần điều chỉnh về định danh, nhà cung cấp và triển khai. Bổ sung kiểm thử hồi quy khi sửa hành vi, đồng thời ghi lại những thay đổi về tính tương thích của lược đồ hoặc giao thức runner.

Tệp nhị phân của nền tảng nhúng frontend chatbot từ `web/native-chat`, vì vậy cần build frontend (Node 22+) trước khi chạy các kiểm tra Go; thao tác này cũng chạy kiểm thử chatbot.

```bash
bash scripts/build-chatbot.sh
go test -p=2 ./... -count=1 -timeout=180s
go vet ./...
python3 scripts/check-public.py
bash scripts/scan-secrets.sh
```

Đóng góp từ cộng đồng không yêu cầu manifest mã nguồn riêng tư hoặc cập nhật hash. Người bảo trì lưu hồ sơ đồng bộ mã nguồn cục bộ, tách khỏi các kiểm tra CI công khai. Xem [chính sách bảo trì](docs/upstream-sync.md).

Chạy [bộ kiểm thử nghiệm thu trình duyệt công khai](e2e/public/README.md) đối với thay đổi liên quan đến xác thực, tùy chọn hoặc thực thi. Các kiểm thử mô hình trả phí và nguồn tri thức bên ngoài cần người vận hành cấu hình rõ ràng; hãy báo cáo chính xác những kiểm tra đã đạt, thất bại, bỏ qua và chưa chạy.

PR của nền tảng chạy các job `core`, `browser` và `first-run`. Kiểm tra ổn định `platform-required` sẽ thất bại trừ khi cả ba đều thành công. Quản trị viên kho mã phải đánh dấu `platform-required` là kiểm tra trạng thái bắt buộc trong cài đặt bảo vệ nhánh GitHub. Kho mã này không thay đổi cài đặt GitHub đó.

Với LoopForge Local, làm việc trong `local/` và tuân thủ [hướng dẫn tác tử cục bộ](local/AGENTS.md). Xác định thay đổi ảnh hưởng đến Classic, Portable hay hợp đồng hành vi dùng chung. Giữ các tài nguyên quy trình này độc lập với nền tảng và với nhau. Thay đổi tài nguyên Portable trong `local/skills/`; tạo lại các gói Classic Cursor/Claude được sinh tự động bằng `python3 scripts/build-classic-hosts.py --write` từ `local/`. Giữ các mẫu quy trình ở dạng tổng quát; công cụ tùy chọn trong `local/tools/` được phân phối riêng.

Chạy các kiểm tra cục bộ từ `local/`:

```bash
python3 scripts/build-classic-hosts.py --check
bash scripts/validate.sh
bash scripts/smoke-install.sh
bash scripts/smoke-npm.sh
bash scripts/smoke-curl-install.sh
bash scripts/e2e.sh
bash scripts/test-observability.sh
bash scripts/scan-secrets.sh
```

[Bộ kiểm thử E2E cục bộ](local/tests/e2e/README.md) dùng host giả lập và các đầu ra đã ghi, không cần thông tin xác thực mô hình. Mô tả tác động đối với từng phiên bản bị ảnh hưởng. Giữ nguyên hành vi phân quyền và cơ chế bảo vệ tệp người dùng hiện có. Thông điệp commit nên tuân theo Conventional Commits.

PR công khai không được chứa thông tin xác thực, hạ tầng riêng tư, thiết lập quyền truy cập mặc định của nhân viên hoặc dữ liệu production. Bảo toàn các tệp người dùng hiện có. Giữ thông tin ghi công mã nguồn và giấy phép bên thứ ba. Mô tả vấn đề, hành vi sau thay đổi và các kiểm chứng đã thực sự thực hiện trong PR.
