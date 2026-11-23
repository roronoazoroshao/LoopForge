# Capability Pack v1 — Nhập/xuất Rules và Skills (tiếng Việt)

> **Trạng thái:** Tính năng đang được phát triển trong PR #11. Tài liệu này mô tả hợp đồng của branch `feat/capability-pack-v1`, không phải một tính năng đã phát hành trên `main`.

## Phạm vi

- Tái sử dụng các bảng `rules`, `skills`, `skill_files` và `CatalogRepo.PutSkillSnapshot`.
- ZIP mang đồng thời nhiều Rules/Skills, hoặc chỉ một loại.
- Mặc định không import `projectId`, `shared`, `global` hoặc `workflowIds` từ ZIP. Người nhập phải chọn dự án đích, và quyền cần là **Owner của dự án hoặc quản trị viên nền tảng** khi xác thực được bật.
- Không cài đặt phụ thuộc, không thực thi script, không kích hoạt Hook khi nhập. **Sau khi gắn Skill vào Role và chạy Role, model có thể tự quyết định chạy lệnh được mô tả trong Skill nếu có công cụ và quyền tương ứng.** Vì vậy hãy kiểm tra nội dung trước khi gắn.

## Định dạng ZIP

```text
capabilities.zip
├── manifest.json
├── README.md                   # tùy chọn
└── skills/
    ├── vi-backend-contract/
    │   ├── SKILL.md
    │   └── references/CHECKLIST.md
    └── vi-evidence-code-review/
        ├── SKILL.md
        └── references/PROVENANCE.md
```

Ví dụ `manifest.json`:

```json
{
  "format": "loopforge-capability-pack",
  "schemaVersion": 1,
  "rules": [
    {
      "id": "vi-evidence-verification",
      "name": "Xác minh bằng chứng",
      "description": "Quy tắc nền cho mọi vai trò",
      "content": "# Xác minh bằng chứng\nKhông báo test pass nếu chưa chạy.",
      "priority": 1000
    }
  ],
  "skills": [
    {
      "id": "vi-backend-contract",
      "name": "Thiết kế và triển khai API",
      "description": "API validation, authz và contract",
      "author": "Nhóm biên soạn của người dùng",
      "version": "1.0.0",
      "license": "user-owned-original",
      "sourceUrl": ""
    }
  ]
}
```

**Cần lưu ý:** `SKILL.md` là một file thực nằm trong ZIP, không phải trường `content` trong manifest. `references/` và các file phụ trợ được giữ theo đường dẫn. `version`, `author`, `license` và `sourceUrl` được lưu như metadata attribution riêng; không được mạo danh `Source` của SkillHub.

## Giao diện

1. Mở **Tài nguyên năng lực → Rules** hoặc **Skills**, chọn dự án (phạm vi **Của dự án**).
2. Nhấn **Nhập gói năng lực**. Chọn tệp ZIP; hệ thống gửi ZIP đến endpoint preflight.
3. Kiểm danh sách và trạng thái `ready`, xem cảnh báo về script/executable, bỏ chọn tài nguyên không muốn nhập.
4. Xác nhận nội dung và rủi ro, nhấn **Nhập tài nguyên đã chọn**.
5. Đọc báo cáo `created`, `skipped`, `failed`, `warnings`. Không coi HTTP 200 là tất cả tài nguyên đều đã nhập.
6. Sau khi xác nhận phiên bản, gắn Skills và Rules cho Role; chưa nên đánh dấu `shared` hoặc chạy Skills chứa script khi chưa thẩm định.
7. Nhấn **Xuất gói năng lực** từ màn Rules hoặc Skills của dự án để nhận ZIP phục vụ backup/chuyển dự án. Export chỉ lấy tài nguyên thuộc dự án, không lấy tài nguyên `shared` của dự án khác.

## API

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/capability-packs/preflight?projectId=<id>` | Body là raw ZIP, trả `items` và `warnings`, không ghi dữ liệu |
| `POST` | `/api/capability-packs/import?projectId=<id>&confirm=1` | Nhập các tài nguyên chưa tồn tại |
| `POST` | `/api/capability-packs/import?projectId=<id>&confirm=1&selected=rules/r1,skills/s1` | Chỉ nhập tài nguyên được chọn |
| `GET` | `/api/capability-packs/export?projectId=<id>&kind=rules` | Xuất Rules |
| `GET` | `/api/capability-packs/export?projectId=<id>&kind=skills` | Xuất Skills |
| `GET` | `/api/capability-packs/export?projectId=<id>&kind=all` | Xuất cả hai |

`POST` phải có `Content-Type: application/zip`. Sử dụng cookie/token hiện hành và Origin cùng host, không chèn bearer token vào tài liệu/script.

Kết quả import:

```json
{
  "created": ["rules/r1", "skills/s1"],
  "skipped": ["skills/old: ID exists"],
  "failed": [],
  "warnings": ["s1: executable or script file scripts/setup.sh; review before attaching to a Role"]
}
```

Các lỗi trước import (`ZIP invalid`, `manifest invalid`, thiếu quyền) chặn toàn bộ request. Khi một tài nguyên không tạo được do lỗi lưu trữ, hệ thống báo lỗi **từng tài nguyên** và có thể đã tạo một số khác; **import không atomic trên toàn bộ ZIP**. Đối với một Skill, `PutSkillSnapshot` vẫn atomic giữa metadata và toàn bộ file.

## Các giới hạn và chính sách bảo mật

- ZIP upload <= 65 MiB; decompressed data <= 128 MiB; tối đa 10.000 ZIP entries.
- Manifest <= 2 MiB; tối đa 200 Rules và 100 Skills; mỗi Rule <= 256 KiB.
- Mỗi Skill yêu cầu `SKILL.md` không rỗng, tối đa 500 files, mỗi file <= 1 MiB, tổng <= 64 MiB.
- Reject path traversal (`..`), absolute path, Windows drive, backslash, duplicate path (không phân biệt hoa/thường), symlink và non-regular file.
- Reject manifest version khác 1, trường JSON không được định nghĩa, trùng ID trong cùng loại tài nguyên.
- ID đã dùng ở bất kỳ project nào sẽ **skip**, không ghi đè hay tự chọn ID mới.
- Không tự bật `shared`/`global`; không thay đổi Role/SOP/MCP hiện có.
- Các file nhị phân giữ permission bits, bao gồm executable. **Việc import không chạy chúng**; thao tác dùng Skill trong sandbox vẫn cần cấp quyền công cụ phù hợp.
- Tệp do người dùng xuất có thể chứa **secret, token, dữ liệu cá nhân hoặc code proprietary**. Phải rà soát, redaction và hạn chế chia sẻ trước khi phát hành ZIP.
- ZIP payload được lưu vào database; không giải nén trực tiếp ra thư mục host trong handler.

## Lưu ý về độ tương thích và hạn chế hiện hành

- ZIP upload một Skill qua `POST /api/skills/:id/files` tiếp tục dùng endpoint riêng và giữ semantics `replace`. **Đừng nhầm** ZIP bulk mới với chức năng này.
- Gói mới **không** tự cài Skill từ SkillHub, không cập nhật snapshot SkillHub và không import MCP.
- Export hiện tại chọn toàn bộ tài nguyên do dự án sở hữu; chỉ nên dùng với tập tài nguyên đã được kiểm tra và giới hạn số lượng. Các tài nguyên của dự án vượt giới hạn pack sẽ bị từ chối.
- Với bản SkillHub có `Source`, export cố gắng đưa version/homepage vào manifest. Giấy phép không được suy ra nếu nguồn không cung cấp.
- Frontend dùng DOM `textContent` để hiển thị tên và cảnh báo từ ZIP, tránh HTML injection.
- Chưa xác minh khả năng cài đặt từ bản ZIP trên environment thật nếu chưa chạy integration test. PR phải giữ Draft đến khi có bằng chứng CI/Go test.

## Triển khai trên laptop Linux (sau khi PR được merge)

```sh
cd ~/LoopForge
git fetch origin
git status --short
git pull --ff-only origin main
```

Nếu `./start.sh dev` gặp `.data/conversations: permission denied`, **không dùng `chmod -R 777` hay xóa `.data`**. Kiểm tra `.dockerignore`, Docker build context, các quyền traversal tới thư mục và xác định user/UID thực hiện build; làm sạch context bằng cơ chế cấu hình, không thay đổi dữ liệu hiện có.

### Bằng chứng cần có trước merge

```sh
go test ./internal/httpapi ./internal/repo ./internal/runtime -count=1
go test ./... -count=1
go vet ./...
cd webtest && npm ci && npm test
```

Cần thêm integration test với ZIP đã đóng gói và import thử trên project staging, test quyền user không phải Owner, kiểm tra `SKILL.md` và file phụ được giữ nguyên bằng checksum, regression cho Role Pack và SkillHub ZIP upload. Đây là **lệnh cần chạy**, không phải lời xác nhận đã chạy.
