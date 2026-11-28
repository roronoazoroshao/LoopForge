# API đồng bộ Gongfeng và TAPD

Xem xác thực và mã trạng thái chung trong [README](README.vi-VN.md). Dịch vụ đồng bộ truy cập hệ thống bên ngoài qua MCP Server trong registry và cấu hình dự án/kho mã.

Khi nhập mục công việc lần đầu, trạng thái yêu cầu của nền tảng được khởi tạo theo trạng thái Gongfeng / TAPD. Khi đồng bộ lại yêu cầu hiện có (tự động, thủ công, kéo theo lịch hoặc đồng bộ lại một mục), giữ nguyên trạng thái nền tảng, nguồn đóng và trạng thái thực thi tự động, chỉ làm mới nội dung bên ngoài, trạng thái gốc và thời điểm đồng bộ trong `externalRef`. Trạng thái đóng bên ngoài vẫn ngăn thực thi thông qua trạng thái gốc nhưng không ghi đè trạng thái yêu cầu hiện có; mở lại bên ngoài cũng không tự động mở lại yêu cầu trên nền tảng.

Yêu cầu và tác vụ TAPD dùng người xử lý `owner` làm người phụ trách nền tảng; lỗi dùng `current_owner`. Trường nhiều người chỉ lấy người không trống đầu tiên, đối chiếu theo tên đăng nhập hoặc tên tiếng Trung trên nền tảng; nếu không khớp, nhập thủ công dùng người thao tác hiện tại, tự đồng bộ dùng chủ dự án làm phương án dự phòng. Mục hiện có giữ người phụ trách nền tảng, chỉ bổ sung theo quy tắc trên nếu người phụ trách trống.

## Cấu hình đồng bộ

Các trường `SyncConfig`:

```json
{
  "playbookSeedRev":1,
  "gongfengProjectId":"10001",
  "gongfengMcpUrl":"https://...",
  "tapdWorkspaceId":"123",
  "tapdIterationId":"456",
  "tapdMcpUrl":"https://...",
  "autoSyncEnabled":true,
  "autoSyncIntervalSec":300,
  "lastSyncAt":"2026-09-02T12:00:00Z",
  "lastSyncStatus":"success",
  "lastSyncError":""
}
```

### `GET /api/sync/config`

Trả về cấu hình hiện tại, `200`.

### `POST|PUT /api/sync/config`

Hai phương thức có cùng ngữ nghĩa. Lưu cấu hình và cấu hình lại dịch vụ đồng bộ, khởi động/làm mới tự đồng bộ. Khi `autoSyncIntervalSec<=0`, đặt thành `300`; các giá trị `lastSyncAt`, `lastSyncStatus`, `lastSyncError` do client gửi bị bỏ qua và giữ giá trị hiện tại trên máy chủ.

Thành công `200` trả về `SyncConfig` đã lưu; lỗi JSON/lưu trữ `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"gongfengProjectId":"10001","tapdWorkspaceId":"123","tapdIterationId":"456","autoSyncEnabled":true,"autoSyncIntervalSec":300}' \
  "$AGENTFLOW_URL/api/sync/config"
```

## Kéo thủ công

### `POST /api/sync/now`

Không có thân yêu cầu. Tải lại cấu hình xác thực MCP, khởi động một lượt pull toàn bộ ở nền và trả ngay:

```json
{"status":"started","syncing":true}
```

Mã trạng thái thông thường `200`. Đây là endpoint khởi chạy tác vụ dài bất đồng bộ: `200` chỉ cho biết goroutine đã khởi động, không có nghĩa đồng bộ thành công và không trả ID tác vụ. Dùng `/api/sync/status` để thăm dò `syncing` và kết quả gần nhất trong cấu hình; cũng có thể xem `/api/sync/logs`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  "$AGENTFLOW_URL/api/sync/now"

curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/sync/status"
```

Hiện tại HTTP response không thay đổi khi một lượt đồng bộ khác đang chạy; dịch vụ đồng bộ xử lý loại trừ đồng thời nội bộ.

## Trạng thái và nhật ký

### `GET /api/sync/status`

Trả về `200`:

```json
{
  "syncing":false,
  "config":{"lastSyncStatus":"success","lastSyncAt":"..."},
  "logs":[]
}
```

`logs` là các bản ghi đồng bộ gần nhất, định dạng như bên dưới.

### `GET /api/sync/logs`

Trả tối đa 100 bản ghi `SyncLog[]` gần nhất, từ mới đến cũ, không cung cấp phân trang con trỏ:

```json
[
  {
    "id":"sync-...",
    "direction":"pull",
    "source":"gongfeng",
    "action":"sync_issues",
    "status":"success",
    "count":12,
    "message":"...",
    "startedAt":"...",
    "finishedAt":"..."
  }
]
```

Mã trạng thái thông thường `200`. Dịch vụ giữ tối đa 200 bản ghi nội bộ nhưng API chỉ cung cấp 100 bản ghi gần nhất.

## Push Issue hiện có tới hệ thống bên ngoài

### `POST /api/sync/create`

Yêu cầu:

```json
{"issueId":"issue-1","target":"gongfeng"}
```

- Bắt buộc `issueId`, `target`.
- `target` chỉ có thể là `gongfeng|tapd`.
- Khi push Gongfeng, nếu Issue chưa liên kết kho mã thì thử kế thừa kho mặc định dự án; cuối cùng vẫn cần cấu hình kho Gongfeng hợp lệ.
- Tải lại cấu hình xác thực MCP trước khi gọi.

Thành công `200` trả Issue đã lưu kèm `source` và `externalRef`; lỗi trường hoặc tạo bên ngoài thất bại thường là `400`; Issue không tồn tại `404`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"issueId":"issue-1","target":"tapd"}' \
  "$AGENTFLOW_URL/api/sync/create"
```

Khi tạo Issue cục bộ mới, cũng có thể truyền trực tiếp `syncTarget` trong `POST /api/issues`; xem [API cộng tác và yêu cầu](collaboration.vi-VN.md).

## Quan hệ với tác vụ theo lịch

Cấu hình tự đồng bộ điều khiển pull định kỳ; `/api/schedule-jobs` dùng để kéo mục ứng viên theo nguồn Gongfeng/TAPD và điều phối SOP chỉ định, hai chức năng không dùng cùng mô hình tác vụ. Xem [API điều phối và lượt chạy](orchestration.vi-VN.md) để biết endpoint tác vụ theo lịch.

Endpoint đồng bộ không có SSE, tải tệp hoặc phân trang. Xác thực MCP bên ngoài, Worker signals nội bộ, OTLP, lease instance và thu hồi sandbox không thuộc API công khai của trang này.
