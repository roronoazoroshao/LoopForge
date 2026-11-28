# API điều phối, thực thi và lập lịch

Xem xác thực và mã trạng thái chung tại [README](README.vi-VN.md).

## SOP (Workflow)

Các trường chính của `WorkflowDefinition`:

```json
{
  "id":"wf-dev",
  "name":"研发 SOP",
  "version":1,
  "revision":0,
  "status":"draft",
  "owner":"platform",
  "tags":["研发"],
  "description":"...",
  "sandboxProfileId":"sandbox-go",
  "nodes":[{"id":"implement","name":"实现","type":"agent","agentId":"agent-dev","maxAttempts":2,"maxReworks":1,"position":{"x":0,"y":0}}],
  "edges":[{"id":"e1","source":"implement","target":"review","when":"success"}]
}
```

Kiểu nút là `agent|script|approval`. Nút script được cấu hình qua `scriptLanguage` (`shell|python`) và `script`. Nút Agent chỉ tham chiếu định nghĩa vai trò; mô tả nhiệm vụ viết trong `prompt` của vai trò (văn bản tự do). Khi thực thi, engine kết hợp tên vai trò, hợp đồng sản phẩm đầu ra, điều kiện kiểm soát và chính sách thử lại thành đề bài cho nút. Có thể cấu hình hợp đồng sản phẩm đầu ra, chính sách lỗi/thử lại và vị trí nút trên canvas. CLI của vai trò khớp danh mục tích hợp trong `GET /api/executors`. Nút `command` cũ được chuyển sang nút shell script khi lưu.

### `GET /api/workflows`

Trả về toàn bộ `WorkflowDefinition[]`, `200`, không phân trang.

Kết quả gồm hai loại SOP: SOP lưu trong dự án và **mẫu dùng chung** trong bảng `generic_templates` (payload có `generic: true`, `projectId` rỗng). Mẫu dùng chung không phụ thuộc dự án, mọi dự án đều nhìn thấy; người dùng thông thường chỉ đọc và phải sao chép vào dự án trước khi sửa. Khi chạy, nút và vai trò được phân giải theo cùng quy trình với SOP tùy chỉnh. Mẫu dùng chung khai báo phụ thuộc thực thi qua `requirements` (ví dụ `gongfeng-git-token`, `gongfeng-mcp`, `tapd-mcp`); Studio kiểm tra phụ thuộc trước khi sao chép. Nếu cần kiểm soát thủ công, có thể thêm nút phê duyệt sau khi sao chép.

### `PUT /api/workflows`

Lưu theo `id`. Bắt buộc có `id` và `sandboxProfileId`; nếu `version=0` thì đổi thành `1`. Thành công trả SOP đã lưu với `200`; xung đột revision trả `409`, lỗi xác thực dữ liệu/lưu trữ khác trả `400`. Nếu `id` trùng mẫu dùng chung, trả `409` (mẫu chỉ đọc).

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"id":"wf-dev","name":"研发 SOP","version":1,"status":"draft","sandboxProfileId":"sandbox-go","nodes":[],"edges":[]}' \
  "$AGENTFLOW_URL/api/workflows"
```

### `GET /api/workflows/{id}`

Thành công trả SOP đầy đủ (kể cả mẫu dùng chung) với `200`; không tồn tại trả `404`.

### `DELETE /api/workflows/{id}`

Thành công `204`, không có nội dung phản hồi. Nếu có run `running|waiting` hoặc SOP còn được Issue chưa đóng liên kết, trả `409`; không tồn tại `404`; lỗi xóa khác `400`. Mẫu dùng chung trả `409` (chỉ đọc).

### revision (phiên bản sửa đổi)

- `GET /api/workflows/{id}/revisions`: `200 DefinitionRevision[]`.
- `GET /api/workflows/{id}/revisions/{revisionId}`: `200 DefinitionRevision`; revision không tồn tại hoặc không thuộc SOP này trả `404`.
- `POST /api/workflows/{id}/revisions/{revisionId}/restore`: khôi phục và trả SOP với `200`; lỗi thường trả `400`.

Các API trên trả `404` trước nếu SOP không tồn tại.

### `POST /api/workflows/{id}/publish`

Không có nội dung yêu cầu. Đặt `status=published`, tăng `version` thêm một, thành công trả SOP với `200`; không tồn tại `404`; lỗi lưu `400`.

### `POST /api/workflows/{id}/clone`

Yêu cầu:

```json
{"id":"wf-dev-copy","name":"研发 SOP 副本","owner":"u-1","projectId":"alpha"}
```

Bắt buộc `id`, `name`. Bản sao luôn có `draft`, `version=1`, `revision=0`, thành công `201`; lỗi trường/lưu trữ `400`, SOP nguồn không tồn tại `404`.

Nếu SOP nguồn là mẫu dùng chung, thao tác sao chép đồng thời tạo các vai trò được mẫu tham chiếu trong dự án chỉ định bởi `projectId` (tái sử dụng vai trò trùng tên đã có), rồi ghi lại `agentId` trên nút thành vai trò trong dự án, để SOP sao chép có thể chạy trực tiếp. Khi đó `projectId` bắt buộc, thiếu trả `400`. Các `requirements` của mẫu được giữ trên bản sao để Studio tiếp tục nhắc phụ thuộc (ví dụ nút tạo MR cần Git Token/MCP Gongfeng).

## Thực thi

Không gian làm việc hội thoại dùng `kind=workspace`, chỉ ghi vòng đời sandbox và tệp, không chạy nút SOP, không chiếm hạn mức SOP. Môi trường lấy từ lựa chọn của người dùng trong cài đặt nâng cao; nếu không có, Main Bot chọn khi mở workspace (mặc định `generic-docker`), sau khi tạo thì cố định. Xem [không gian làm việc hội thoại](../conversation-workspaces.md). Điểm ghi cộng tác vai trò cũ đã bị loại bỏ, vẫn xem được lịch sử.

Trạng thái run thường là `running|waiting|succeeded|failed|cancelled`. `nodes` trong phản hồi ánh xạ ID nút tới `NodeRun`; đồng thời chứa usage, toolCalls, metadata artifact, thời gian và revision.

`ownerInstanceId`, `leaseUntil`, `executionGeneration`, `workspaceHost`, `workspaceRoot`, `sandboxId` là thông tin lease/vị trí thực thi nội bộ. Client có thể bỏ qua, không nên dựa vào chúng để tiếp quản instance hoặc thao tác vòng đời sandbox.

### `GET /api/runs`

Trả mảng tóm tắt mọi run, `200`, không phân trang. Tóm tắt bỏ nội dung artifact, telemetry, nhật ký, sự kiện và snapshot workflow; cắt bớt input/lỗi và bỏ đầu ra lớn của nút đã hoàn tất.

Có thể truyền `projectId` để giới hạn dự án; `responsible=me` chỉ trả tác vụ do người dùng đang đăng nhập phụ trách thực hiện hoặc có yêu cầu liên kết mà người phụ trách là chính người dùng đó; `responsible=me` khi chưa đăng nhập trả `401`. Có thể kết hợp hai bộ lọc.

### `POST /api/runs`

Khởi chạy SOP trực tiếp:

```json
{"workflowId":"wf-dev","input":"实现审计日志","projectId":"platform"}
```

`projectId` tùy chọn, nhưng nếu có thì phải tồn tại. Thành công trả run mới với `201`; thực thi bị vô hiệu hóa `403`; lỗi workflow/tham số/engine thường `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"workflowId":"wf-dev","input":"实现审计日志","projectId":"platform"}' \
  "$AGENTFLOW_URL/api/runs"
```

API chỉ khởi động tác vụ dài, không đợi hoàn tất. Với công việc đã lưu thành Issue, ưu tiên Issue dispatch để tạo liên kết task/issue.

### `GET /api/runs/{runId}`

Thành công trả chi tiết run với `200`; không tồn tại `404`. Chi tiết:

- Artifact chỉ trả metadata, không trả `content`;
- Telemetry/logs không nhúng, phải dùng API riêng;
- Snapshot workflow bỏ script của nút (và trường tương thích command);
- Events trả tối đa 80 mục gần nhất; một số văn bản đầu ra bị cắt bớt.

### `DELETE /api/runs/{runId}`

Thành công `200 {"status":"deleted"}`; không tồn tại hoặc không thể xóa thường `400`. Handler hiện tại không kiểm tra thêm trạng thái thực thi; ràng buộc do tầng lưu trữ quyết định.

### `GET /api/runs/{runId}/preview/download`

Tải toàn bộ website tĩnh đã lưu trữ, trả `200 application/zip`, tên tệp `preview-{runId}.zip`. Gốc ZIP chứa nội dung thư mục sản phẩm build, giữ HTML, JS, CSS, hình ảnh và đường dẫn tương đối; không chứa script phiên hoặc địa chỉ backend được chèn vào bản xem trước trực tuyến. Vẫn tải được sau khi dọn workspace, không build lại.

Dùng yêu cầu xác thực của API run, không cần phiên xem trước. Run, bản xem trước hoặc gói tĩnh không tồn tại trả `404`, chưa sẵn sàng `409`, đã hết hạn hoặc bị xóa `410`. Tải xuống không kéo dài thời gian lưu bản xem trước, hỗ trợ HTTP Range.

## Thực thi thời gian thực qua SSE

### `GET /api/runs/{runId}/stream?after={seq}&logsAfter={seq}`

Thành công phản hồi `200 text/event-stream`. `after` là sequence telemetry đã tiêu thụ, `logsAfter` là sequence nhật ký; không hợp lệ/bỏ trống được xem là `0`. Mỗi sự kiện cập nhật:

```text
id: 12
event: run
data: {"run":{...},"telemetryDelta":[...],"logDelta":[...]}
```

- `id` là revision của run.
- `run` là chi tiết thời gian thực, nhưng không có events, nội dung telemetry/nhật ký; input và văn bản nút bị cắt bớt.
- Mỗi `telemetryDelta`, `logDelta` giữ tối đa 80 mục mới nhất.
- Khi rảnh, gửi heartbeat dạng chú thích `: heartbeat` mỗi 15 giây.
- Run không tồn tại hoặc đăng ký thất bại trả `404`; máy chủ không hỗ trợ flush trả `500`.
- Client ngắt kết nối thì hủy đăng ký; luồng kết thúc khi server đóng kênh cập nhật. Hiện không phân tích `Last-Event-ID`, khi kết nối lại phải truyền sequence rõ ràng.

```bash
curl -N -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/runs/run-1/stream?after=0&logsAfter=0"
```

## Nhật ký, telemetry và tải xuống

### Phân trang bằng con trỏ

`GET /api/runs/{runId}/logs` và `/telemetry` dùng chung con trỏ sequence:

- `limit`: mặc định 100, tối đa 200; nhỏ hơn hoặc bằng 0 cũng tính là 100.
- `after=N`: đọc tiến `sequence>N`.
- `before=N`: đọc lùi `sequence<N`; nếu không truyền `after`/`before` thì trả trang mới nhất.
- Nếu truyền cả hai, ưu tiên `after`.
- Kết quả luôn sắp xếp sequence tăng dần.
- `nextAfter` là sequence cuối trang, phù hợp cập nhật tăng dần; `nextBefore` là mục đầu, dùng lùi trang; `hasMore` cho biết còn dữ liệu theo hướng hiện tại; `sequence` là tổng số thứ tự hiện tại của run.

### `GET /api/runs/{runId}/logs`

Tham số: `nodeId`, `after`, `before`, `limit`. Thành công `200`:

```json
{"runId":"run-1","sequence":321,"logs":[{"id":"log-1","sequence":201,"timestamp":"...","level":"info","stream":"stdout","body":"...","source":{},"context":{}}],"nextAfter":201,"nextBefore":201,"hasMore":false}
```

Nội dung log trong phản hồi tối đa 2000 byte; không tồn tại `404`, lỗi truy vấn thường `400`.

### `GET /api/runs/{runId}/telemetry`

Tham số: `nodeId`, `adapter`, `after`, `before`, `limit`. `adapter` có thể là `all`/rỗng, `hooks`, `otel`, `live` hoặc tên adapter cụ thể. Thành công `200`:

```json
{"runId":"run-1","sequence":120,"events":[{"id":"ev-1","sequence":101,"category":"tool","name":"tool.call","message":"...","source":{"adapter":"live","protocol":"..."}}],"nextAfter":101,"nextBefore":101,"hasMore":false}
```

Phản hồi công khai cắt bớt message, loại bỏ attributes, metrics, chi tiết tool/modelOperation, đồng thời rút gọn source/context. Không tồn tại `404`, lỗi truy vấn thường `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/runs/run-1/logs?nodeId=implement&before=500&limit=100"
```

### `GET /api/runs/{runId}/logs.txt?nodeId={nodeId}`

Tải nhật ký worker, `200 text/plain; charset=utf-8`, header phản hồi:

```text
Content-Disposition: attachment; filename="run-1-worker-logs.txt"
```

Bỏ `nodeId` để tải mọi nút. Xuất tối đa 20.000 mục, định dạng gồm chú thích đầu tệp, thời gian, nút, stream và nội dung. Run không tồn tại `404`; lỗi xuất thường `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -OJ \
  "$AGENTFLOW_URL/api/runs/run-1/logs.txt"
```

### `GET /api/runs/{runId}/artifacts/{artifactId}`

Trả nội dung văn bản gốc của artifact, `200`. `Content-Type` là media type đã ghi cộng `charset=utf-8`, `Content-Disposition: inline`, và đặt `ETag` theo SHA-256. `text/markdown`, `application/json` lần lượt dùng tên tệp `.md`, `.json`; kiểu khác dùng `.txt`. Artifact không tồn tại trả `404`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -OJ \
  "$AGENTFLOW_URL/api/runs/run-1/artifacts/artifact-1"
```

## Thao tác thủ công

Các API sau khi thành công đều trả `200 {"ok":true}`; lỗi run/node/trạng thái thường `400`. Run liên kết Issue mà thực thi đã đóng hoặc bàn giao bị khóa sẽ trả `409` khi approve, pass, reject, retry.

### `POST /api/runs/{runId}/approve`

```json
{"nodeId":"approval"}
```

Phê duyệt nút đang chờ.

### `POST /api/runs/{runId}/pass`

```json
{"nodeId":"phpunit-full"}
```

Coi nút **script** đã thất bại là đạt và tiếp tục các nút phía sau mà không thực thi lại nút này. Dùng sau khi dừng bởi `onFailure=fail` hoặc đã đạt giới hạn số vòng làm lại, tránh bị kẹt mãi ở script. Nút Agent/AI không thể cho đạt thủ công; phải dùng `/retry` và cung cấp ngữ cảnh bổ sung.

### `POST /api/runs/{runId}/reject`

```json
{"nodeId":"approval","targetId":"implement","reason":"缺少回归测试"}
```

Từ chối và quay lại theo `targetId`/chính sách workflow.

### `POST /api/runs/{runId}/retry`

```json
{"nodeId":"implement","reason":"修复失败测试"}
```

Thử lại nút. Khi gọi từ web, dùng `Prefer: respond-async` để tách khôi phục workspace khỏi chạy lại nút:

- Nếu cần khôi phục workspace, trả `202 {"workspaceRestore":{"status":"restoring","startedAt":"..."},"retryAfterMs":1000}`. Khôi phục tiếp tục trong nền; ngắt trang không giải phóng lease của tác vụ khôi phục; yêu cầu khác của cùng Run dùng lại tác vụ đó.
- Thăm dò `GET /api/runs/{runId}/workspace/restore`, trả `idle|restoring|ready|failed`, khi thất bại có `error`. Chỉ thành viên dự án được đọc API này.
- Sau `ready`, gửi lại yêu cầu chạy lại ban đầu; chỉ `200 {"ok":true}` mới cho biết đã bắt đầu chạy lại. Có thể kèm `expected:{"status":"succeeded","attempt":11,"reworkCount":0}` để tránh chạy lại lượt cũ nếu nút đã thay đổi trong quá trình khôi phục.

Sau khi đóng trang, chỉ tác vụ khôi phục workspace đã được chấp nhận tiếp tục; mở lại trang để xem trạng thái khôi phục, rồi chủ động khởi chạy lại nút. `POST /api/runs/{runId}/resume` và `POST /api/runs/{runId}/workspace/restore` cũng hỗ trợ `Prefer: respond-async`. Lời gọi không có header này giữ ngữ nghĩa đồng bộ.

### `POST /api/runs/{runId}/decline-retry`

```json
{"nodeId":"implement"}
```

Từ chối thử lại do engine đề xuất.

### `POST /api/runs/{runId}/cancel`

Không cần trường yêu cầu; có thể dùng JSON rỗng `{}`. Hủy run.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' -d '{"nodeId":"approval"}' \
  "$AGENTFLOW_URL/api/runs/run-1/approve"
```

## Đánh giá Run

Chỉ đánh giá run ở trạng thái kết thúc (`succeeded|failed|cancelled`). Kích hoạt thủ công, dùng thông tin xác thực executor của người yêu cầu.

### `POST /api/runs/{runId}/eval`

Yêu cầu có thể chứa `model`, ví dụ `{ "model": "codex:<model>" }`. Nếu bỏ qua hoặc dùng `default`, chọn executor và mô hình mặc định từ cấu hình cá nhân của người yêu cầu. Thành công trả `202` cùng bản ghi đánh giá (`status=running`). Run đang chạy trả `409`. Chưa đăng nhập `401`. Thiếu thông tin xác thực executor đã chọn `400`.

### `GET /api/runs/{runId}/eval`

Lần đánh giá mới nhất. Nếu chưa có bản ghi, trả `200` và `status` rỗng.

### `GET /api/runs/{runId}/evals`

Tối đa 10 lần đánh giá gần nhất.

### `GET /api/runs/{runId}/eval/stream`

SSE: `thought` / `done` / `error`.

### `POST /api/runs/{runId}/eval/apply`

Yêu cầu `{ "evalId":"eval-1", "recommendationIds":["rec-1"] }`. Hợp nhất đề xuất đã được người dùng xác nhận vào SOP hoặc vai trò **hiện tại**, không sửa snapshot cố định của run này. Mẫu dùng chung chỉ đọc được sao chép vào dự án trước khi sửa.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' -d '{"model":"default"}' \
  "$AGENTFLOW_URL/api/runs/run-1/eval"
```

## Chỉ số và phân tích

### `GET /api/workflow-metrics`

Trả toàn bộ `WorkflowMetrics[]`, `200`. Mỗi mục có số run, số lượng theo từng trạng thái, tỷ lệ hoàn tất vòng đời/thành công/làm lại, thời gian trung bình, tổng hợp token/tool/artifact, run gần nhất và chỉ số nút.

### `GET /api/analytics`

Tham số truy vấn:

- `projectId`, `workflowId`: bộ lọc tùy chọn;
- `userId`, `issueSource`: lọc theo người phụ trách hoặc nguồn yêu cầu (`local`, `gongfeng`, `tapd`);
- `scope=overview`: trả tổng hợp nhẹ cần cho trang mức sử dụng, bỏ qua quét bàn giao;
- `grain`: độ chi tiết xu hướng, chọn `day`, `week`, `month`, `all` (tổng hợp toàn bộ lịch sử theo tháng);
- `from`, `to`: thời gian RFC 3339 tùy chọn; giá trị sai trả `400`.

Thành công `200` trả `AnalyticsSnapshot`: `filter`, `summary`, `trend`, breakdown theo workflow/agent/executor/model/node, `failures`, `coverage`, `deliveries` và `delivery`. `demo` cung cấp token trung bình, tỷ lệ thành công công cụ, số can thiệp thủ công trung bình và tỷ lệ hoàn tất tự động; `runTraces` cung cấp chỉ mục truy sâu `TAPD/Issue → workflow_task_id → run_id → trace_id`, sự kiện gốc tiếp tục đọc qua API phân trang Run telemetry.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/analytics?projectId=platform&from=2026-09-01T00%3A00%3A00Z"
```

### `GET /api/observability/spec`

Trả đối tượng mô tả đặc tả quan sát công khai mà runtime hỗ trợ, `200`. Đây là mô tả năng lực, không phải endpoint tiếp nhận dữ liệu; `/api/otel/v1/traces` nội bộ không thuộc API công khai.

## Tác vụ theo lịch

`ScheduleJob` chia hai loại, phân biệt bằng `skipDispatch`, không thể viết chung trong một tác vụ.

Tác vụ kích hoạt (`skipDispatch=false`) có các trường `id`, `name`, `enabled`, `projectId`, `workflowId` / `useIssueWorkflow`, `intervalSec` hoặc `cron`, kết quả thực thi gần nhất và timestamp. Khi đến lịch, quét yêu cầu chưa chạy trong dự án này, kiểm tra điều kiện baseline rồi điều phối SOP; xung đột nhánh tích hợp kho mã khiến tác vụ mang trạng thái `waiting` cùng `blockers`, tạm dừng điều phối tự động; Agent đồng bộ sẽ tự giải quyết xung đột và hợp nhất vào baseline.

Tác vụ kích hoạt có `maxDispatch` tùy chọn, giới hạn số yêu cầu được kích hoạt thành công mỗi lần, từ 1–10; không cấu hình (hoặc bằng 0) mặc định 10, áp dụng cả tác vụ cũ. Thực thi tự động và “Chạy ngay” dùng chung giới hạn này; yêu cầu đã có tác vụ, bị baseline chặn hoặc bị bỏ qua khi điều phối không chiếm suất, các yêu cầu còn lại dành cho lần sau. `lastPulled` vẫn ghi số ứng viên khớp, `lastDispatched` ghi số thực sự kích hoạt thành công lần này. Tác vụ AI theo lịch không dùng cấu hình này.

Tác vụ AI theo lịch (`skipDispatch=true`) gồm `id`, `name`, `enabled`, `projectId`, `assistantPrompt`, `assistantModel`, `ownerUserId` và `intervalSec` hoặc `cron`. Khi kích hoạt, mở một lượt hội thoại toàn quyền dưới danh tính người lưu, dùng prompt của tác vụ. Đọc danh mục mô hình qua `GET /api/assistant/models?schedule=1`.

Tác vụ AI theo lịch luôn dùng chế độ tự động thực thi, không chịu ảnh hưởng của chế độ phê duyệt hội thoại Studio; thao tác ghi nền tảng không cần người xác nhận từng lần.

Tác vụ AI theo lịch không có giới hạn thời lượng riêng: giống hội thoại thường, lượt kết thúc khi CLI kết thúc hoặc có người dừng từ trang hội thoại; gateway công cụ kết thúc cùng lượt. Nếu instance này đã có tác vụ theo lịch đang chạy, cron đến hạn bị bỏ qua, không xếp hàng và không chạy bù sau khi tác vụ hiện tại kết thúc; chờ lần cron tiếp theo. Chạy thủ công vẫn trả `409`.

### `GET /api/schedule-jobs`

Trả toàn bộ `ScheduleJob[]`, `200`, không phân trang.

### `POST|PUT /api/schedule-jobs`

Tạo mới hoặc cập nhật theo `id`, hai phương thức cùng ngữ nghĩa. Bắt buộc `name`. Lịch là `intervalSec` (khoảng thời gian thông thường) hoặc `cron` 5 trường (UTC+8). Tác vụ AI theo lịch cần `assistantPrompt` hoặc phiên bản tác vụ chia sẻ. Tác vụ kích hoạt cần `workflowId`, tùy chọn `useIssueWorkflow`. Khi cập nhật không truyền `blockers`, giữ trạng thái tạm dừng baseline của tác vụ kích hoạt.

Server liên kết `runAsUserId` với người dùng đăng nhập thực hiện lần lưu. Codex và Claude Code ưu tiên “Đăng nhập tài khoản” trên máy thực thi cá nhân mặc định của người dùng, cần Runner 0.10.2 trở lên và CLI đã bật. Khi máy mặc định ngoại tuyến hoặc chưa bật đăng nhập tài khoản, dùng API Key cá nhân của người dùng để thực thi CLI và mô hình đã chỉ định trên đám mây. Khi thiếu key hoặc thực thi thất bại, tác vụ ghi lý do cụ thể. CodeBuddy thiếu key cá nhân sẽ dùng key chia sẻ của nền tảng, chỉ chọn được mô hình quản trị viên cho phép. Nếu mô hình rỗng hoặc `default`, lấy mô hình mặc định của key chia sẻ. Tác vụ cũ không có danh tính thực thi lần lượt thử thông tin xác thực cá nhân của Owner dự án, Owner của bản ghi tác vụ độc lập, cuối cùng thử key chia sẻ nền tảng.

Lưu thiếu thông tin xác thực trả `400`. Thành viên dự án không có thông tin xác thực vẫn có thể tắt tác vụ mà cấu hình thực thi không thay đổi; server kiểm tra lại dự án và cấu hình thực thi trong khóa hàng, rồi chỉ đổi `enabled` thành false. Nếu thay đổi đồng thời làm kiểm tra thất bại, trả `409`.

Nếu `sessionMode` của tác vụ AI theo lịch rỗng, mỗi lần thực thi mở một hội thoại mới; nếu `fixed`, luôn tiếp tục cùng hội thoại. Khi mở mới mỗi lần, dùng `sessionKeep` để đặt số hội thoại gần nhất được giữ (`10` / `50` / `100`, `-1` không giới hạn, không truyền mặc định `50`, giá trị khác `400`); sau mỗi lần thực thi, xóa hội thoại cũ hơn, không ảnh hưởng bản ghi thực thi.

Tạo `id` nếu rỗng; `projectId` mặc định `platform`; nếu `intervalSec<30` thì đặt lại `300`. Cập nhật không cung cấp `lastRunAt` sẽ giữ các trường run gần nhất hiện có. Thành công `200` trả job; lỗi xác thực dữ liệu/lưu trữ `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"name":"自动修线上单","enabled":true,"projectId":"platform","workflowId":"wf-dev","useIssueWorkflow":true,"intervalSec":3600}' \
  "$AGENTFLOW_URL/api/schedule-jobs"
```

### `DELETE /api/schedule-jobs/{id}`

Thành công `200 {"ok":true}`; không tồn tại/lỗi xóa thường `400`.

### `POST /api/schedule-jobs/{id}/run`

Khởi chạy job một lần trên server, `202` trả `ScheduleJob` có `lastStatus=running`. Lời gọi HTTP này không chờ quét, prompt AI hoặc điều phối hoàn tất; đóng trình duyệt hoặc ngắt client MCP không hủy tác vụ. Dùng `GET /api/schedule-jobs` thăm dò cho tới khi `lastStatus` đổi thành `success` / `failed` / `waiting`. SOP được điều phối vẫn chạy dưới dạng tác vụ dài độc lập.

- Instance hiện tại có `AGENTFLOW_SCHEDULER_ENABLED=false` trả `409`.
- Đã có tác vụ theo lịch đang chạy trên instance này trả `409`.
- Job không tồn tại thường `400`.
- Lỗi sau khi khởi chạy được ghi vào `lastStatus` / `lastError` của job, không trả qua mã HTTP của POST này.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  "$AGENTFLOW_URL/api/schedule-jobs/job-1/run"
```

### `POST /api/schedule-jobs/{id}/enabled`

Bật/tắt lập lịch job, body `{"enabled": true|false}`, `200` trả `ScheduleJob` đã cập nhật. Chỉ đổi `enabled`: prompt, danh tính thực thi (`runAsUserId`) và chế độ hội thoại không đổi; lần thực thi đang chạy không bị ngắt. Cần quyền ghi dự án này (thành viên chỉ đọc `403`), job không tồn tại `404`, thiếu `enabled` trả `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST -H 'Content-Type: application/json' \
  -d '{"enabled":false}' "$AGENTFLOW_URL/api/schedule-jobs/job-1/enabled"
```

### `GET /api/schedule-job-executions`

Trả bản ghi thực thi `ScheduleJobExecution[]`, sắp xếp giảm dần theo thời gian bắt đầu. Mỗi lần chạy (theo lịch hoặc thủ công) có một bản ghi, gồm `status` (running / success / failed / waiting), `error`, `durationMs`, số ứng viên và điều phối, tóm tắt phản hồi AI, cùng `runs[]` đã điều phối (`issueId`, `runId`). Mỗi job giữ 200 bản ghi gần nhất, xóa cùng khi xóa job. Thực thi AI có `sessionId`. Bản ghi thực thi tồn tại lâu hơn hội thoại (hội thoại được dọn theo `sessionKeep` và thời hạn lưu, cũng có thể bị xóa thủ công), nên mỗi lần đọc danh sách đều kiểm tra hội thoại còn không: nếu không còn, trả `sessionGone: true`. Trường này chỉ được tính khi đọc, không ghi vào bản ghi; không đánh dấu lần thực thi đang chạy.

Mỗi lần nhận thực thi, sinh `traceId` gồm 32 ký tự thập lục phân, ghi đồng thời vào `lastTraceId` của job và toàn bộ nhật ký lập lịch của lần này (`schedule job <id> trace=<traceId>: …`), dùng để tìm nguyên nhân thất bại trong nhật ký server. Công cụ nền tảng `schedule_job_executions_list` (dùng được ở cả `/mcp` và trợ lý Studio) tương ứng API này; khi dán Trace ID đã sao chép vào trợ lý, trợ lý truy vấn lần thực thi theo `query.traceId`. Khi server khởi động lại, lần thực thi còn running trước đó được ghi failed (“Lần chạy trước bị gián đoạn (server khởi động lại)”).

Tham số truy vấn: `projectId`, `jobId`, `status`, `traceId`, `limit` (mặc định 100, tối đa 500). Chỉ trả bản ghi của job người gọi được quyền đọc; `jobId` trỏ job không có quyền đọc trả `403`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/schedule-job-executions?projectId=platform&status=failed"
```

### `GET /api/schedule-job-executions/dashboard`

Một trang bảng điều khiển bản ghi thực thi, lọc, đếm và phân trang đều thực hiện phía server. Tham số: `projectId` (bắt buộc), `jobId`, `status`, `since` (RFC 3339, chỉ xem lần thực thi bắt đầu từ sau thời điểm này), `q` (không phân biệt hoa thường, khớp tên job, ID job, Trace ID, lỗi, phản hồi AI và run được điều phối), `offset`, `limit` (mặc định 20, tối đa 100). Trả về:

- `items`: bản ghi thực thi trang hiện tại, giảm dần theo thời gian bắt đầu, các trường như trên (gồm `sessionGone`);
- `total`: số bản ghi khớp bộ lọc;
- `overview.current` / `overview.previous`: `total`, `finished`, `success`, `failed`, `running`, `avgMs` của 7×24 giờ gần nhất (gồm giờ hiện tại) và 7×24 giờ trước đó, chỉ thay đổi theo `jobId`. Lần thực thi đã kết thúc lấy từ bảng thống kê cộng dồn theo giờ `schedule_job_execution_stats` (lưu 30 ngày, xóa cùng tác vụ), không bị ảnh hưởng bởi giới hạn 200 bản ghi/tác vụ; lần đang chạy được đếm từ bản ghi;
- `records`: tổng bản ghi dự án này đang lưu; `recentFailed`: số lần thất bại trong 7 ngày gần đây của dự án (dùng cho huy hiệu tab).

Thiếu `projectId` hoặc `since` sai định dạng trả 400; `jobId` thuộc dự án không có quyền truy cập trả 403. Bảng thống kê bắt đầu cộng dồn từ khi triển khai. Khi nâng cấp, có thể sao lưu và dừng nền tảng, rồi chạy thủ công `migrations/039_schedule_execution_legacy_stats.sql` để bổ sung lần thực thi cũ còn lưu vào các bucket giờ còn thiếu; script không ghi đè bucket hiện có, từ chối bổ sung nếu phát hiện trùng một phần, không tái tạo bản ghi đã dọn và không ước tính token cũ.

Các trường tùy chọn `model`, `usage`, `costCny` của bản ghi thực thi AI lưu mức tiêu thụ và chi phí ước tính của generation này, gồm lượt thử lại và lời gọi đã báo cáo trước khi lỗi, không gồm lần thực thi trước trong cùng hội thoại cố định hoặc SOP phía sau. Thiếu `usage` nghĩa là chưa báo cáo. `overview.current` / `overview.previous` còn trả `metered`, `tokens` (`total`, `input`, `output`, `cacheRead`, `cacheWrite`), `avgTokens`, `priced`, `costCny`. `tokens.total` ưu tiên tổng do mô hình báo cáo, nếu không có thì bằng input cộng output; không cộng thêm chi tiết cache. `avgTokens` chỉ tính trung bình trên lần thực thi đã báo cáo, `priced` chỉ tính lần có thể ước giá.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/schedule-job-executions/dashboard?projectId=platform&status=failed&offset=0&limit=20"
```

Điều phối theo lịch cố định ngữ cảnh nhánh tích hợp và tránh thực thi trùng một yêu cầu. Việc yêu cầu đã được làm rõ hay chưa không ảnh hưởng điều phối. Worker signals, lease instance và thu hồi sandbox là cơ chế nội bộ, không thuộc API lập lịch công khai.
