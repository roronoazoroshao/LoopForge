# API cộng tác và yêu cầu

Xem xác thực, mã trạng thái chung và base URL trong [README](README.vi-VN.md). Các endpoint mảng trên trang này không phân trang.

## Dự án

### `GET /api/projects`

Trả `Project[]`, `200`. Dự án gồm `id`, `key`, `name`, `description`, `color`, `workflowId`, `defaultRepositoryId`, `members`, `clarification`, cấu hình TAPD và dấu thời gian. Thông tin xác thực Git lưu theo người dùng và host trong Cài đặt cá nhân, không thuộc dự án.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" "$AGENTFLOW_URL/api/projects"
```

### `GET /api/projects/{id}`

Trả một `Project` đã ẩn dữ liệu nhạy cảm; không tồn tại trả `404 {"error":"project not found"}`.

### `POST|PUT /api/projects`

Hai phương thức cùng ngữ nghĩa, tạo mới hoặc cập nhật toàn bộ theo `id`. Yêu cầu là `Project` kèm công tắc xóa tùy chọn:

```json
{
  "id":"platform",
  "name":"平台研发",
  "key":"PLATFORM",
  "defaultRepositoryId":"repo-platform",
  "workflowId":"wf-dev",
  "codeBuddyApiKey":"",
  "codeBuddyApiKeyClear":false,
  "codeBuddyInternetEnvironmentClear":false,
  "tapdClear":false
}
```

Bắt buộc `id`, `name`; nếu `key` trống, lấy `id` viết hoa. Khi cập nhật, giá trị nhạy cảm để trống giữ giá trị cũ; chỉ xóa nếu `*Clear=true` tương ứng. `defaultRepositoryId` phải thuộc dự án này. Thành công `200` trả dự án đã ẩn dữ liệu nhạy cảm; lỗi tham số `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"id":"platform","name":"平台研发"}' \
  "$AGENTFLOW_URL/api/projects"
```

## Kho mã

Các trường chính của `Repository` là `id`, `projectId`, `provider`, `name`, `gongfengProjectId`, `webUrl`, `cloneUrl`, `defaultBranch`, `localPath`, cấu hình pipeline và `integrateBranch`.

### `GET /api/repositories`

Trả `Repository[]`, `200`. Kho mã không lưu thông tin xác thực Git.

### `GET /api/repositories/{id}`

Trả một `Repository` đã ẩn dữ liệu nhạy cảm; không tồn tại trả `404 {"error":"repository not found"}`.

### `POST|PUT /api/repositories`

Tạo mới hoặc cập nhật theo `id`. Bắt buộc `projectId`, có thể dùng `repoUrl` để dán địa chỉ kho. Nền tảng nhận diện GitHub và bộ adapter triển khai; địa chỉ HTTPS khác dùng `https`, địa chỉ SSH rõ ràng dùng `ssh`, không chuyển giao thức truyền tải. Có thể suy ra `name` từ địa chỉ, `defaultBranch` mặc định `main`, máy chủ tạo `id` khi trống. Thông tin xác thực được quản lý qua `/api/users/{id}/git-http-credentials` hoặc `/api/users/{id}/git-ssh-keys`. HTTPS dùng Git credential helper chuẩn; khóa SSH có thể clone và push, nhưng tạo PR/MR vẫn cần token truy cập nền tảng lưu trữ và do bước Agent thực hiện. Thành công `200` trả kho mã; lỗi xác thực `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"platform","name":"agentflow","gongfengProjectId":"10001","cloneUrl":"https://example/repo.git","defaultBranch":"main"}' \
  "$AGENTFLOW_URL/api/repositories"
```

### `DELETE /api/repositories?id={id}`

Bắt buộc `id`. Xóa kho thành công và xóa cài đặt kho mặc định dự án tham chiếu nó, trả `200 {"status":"deleted"}`; thiếu `id` hoặc lỗi lưu trữ là `400`.

## Issue

Các trường thường dùng của `Issue`:

- `id`, `projectId`, `number`, `title`, `description`
- `status`: `backlog|todo|in_progress|in_review|done|blocked|cancelled`
- `priority`, `kind` (`requirement|issue`), `assigneeType`, `assigneeId`
- `workflowId`, `repositoryId`, `repositoryIds`, `baseBranch`, `repositoryBranches`, `latestTaskId`
- `source` (`local|gongfeng|tapd`), `externalRef`
- `clarification`: `summary`, `status` (`analyzing|in_progress|ready`; dữ liệu lịch sử có thể là `needs_user`), `history`, `questions`, các trường ghi lại. Làm rõ là bước tùy chọn, không chấm điểm, không tự bắt đầu và không chặn điều phối SOP.
- Trường bàn giao `deliveryState`, `deliveryMrUrl`, `deliveryMrState`, `deliveryMrs`, `deliveryUpdatedAt`. `deliveryMrs` có một mục mỗi kho (`repositoryId`, `repository`, `project`, `iid`, `url`, `state`, `targetBranch`), được xác định khi SOP thành công bằng truy vấn MR từ Gongfeng theo nhánh làm việc từng kho; chỉ khi không tìm thấy mới dùng liên kết cùng dự án trong đầu ra MR. `deliveryMrUrl` là mục đầu tiên, `deliveryMrState` là trạng thái tổng hợp (chỉ khi tất cả hợp nhất vào nhánh mặc định mới là `merged`).

### `GET /api/issues`

Trước tiên làm mới trạng thái task/issue theo run liên kết, rồi trả yêu cầu khớp.

Query tùy chọn: `projectId`, `status` (có thể phân cách dấu phẩy, OR), `source` (có thể phân cách dấu phẩy, OR), `q` (tìm gần đúng tiêu đề bỏ qua hoa/thường, khoảng trắng, dấu câu và thứ tự nhiều từ khóa, đồng thời hỗ trợ id/số/ID bên ngoài), `limit`, `offset`.

- Không truyền `limit`: trả `Issue[]` (bảng Studio tiếp tục dùng dạng này).
- Truyền `limit`: trả `{items,total,offset,limit,hasMore}`. `limit` mặc định được hiểu là 50, tối đa 200; `offset` mặc định 0. `limit`/`offset` không hợp lệ trả `400`.

Thành công `200`.

### `POST|PUT /api/issues`

Hai phương thức cùng ngữ nghĩa. Yêu cầu:

```json
{
  "id":"issue-local-1",
  "projectId":"platform",
  "title":"增加审计日志",
  "description":"记录配置变更",
  "kind":"requirement",
  "repositoryId":"repo-platform",
  "workflowId":"wf-dev",
  "syncTarget":"gongfeng"
}
```

Bắt buộc `projectId`, `title` và dự án phải tồn tại. `status` mặc định `backlog`, `priority` mặc định `medium`; nếu không chỉ định kho, kế thừa kho mặc định dự án; kho chỉ định phải thuộc dự án. Với một kho, có thể tiếp tục nhánh tính năng hiện có qua `baseBranch`; để trống tạo nhánh làm việc từ nhánh chính đã cấu hình.

Với nhiều kho, dùng `repositoryBranches` chỉ định nhánh tính năng hiện có theo ID kho, ví dụ `{"repositoryIds":["api","web"],"repositoryBranches":{"api":"feature/api","web":"feature/web"}}`. Ánh xạ này ưu tiên hơn `baseBranch`; kho không chỉ định hoặc để trống tạo nhánh làm việc từ nhánh chính riêng đã cấu hình. Khi tiếp tục nhánh hiện có, MR vẫn nhắm nhánh chính đã cấu hình của kho. Kho trong ánh xạ phải được liên kết và không được phát triển trực tiếp trên nhánh chính hoặc nhánh tích hợp. Khi cập nhật hoặc nhập lại TAPD, bỏ qua ánh xạ sẽ giữ nhánh của kho vẫn liên kết; `{}` rõ ràng xóa mọi lựa chọn. Sửa nhánh bất kỳ kho nào sẽ đặt lại phiên làm rõ mã và giữ câu trả lời nghiệp vụ.

Issue mới phải liên kết tracker bên ngoài: nếu yêu cầu không có `source/externalRef` hợp lệ, `syncTarget` phải là `gongfeng` hoặc `tapd`, dịch vụ đồng bộ tạo rồi lưu; Gongfeng còn yêu cầu kho mã. Khi cập nhật, nhiều trường trống kế thừa giá trị cũ. Thành công `200` trả Issue; lỗi xác thực/đồng bộ thường là `400`.

### `GET /api/issues/{issueId}`

Thành công `200`:

```json
{"issue":{"id":"issue-1","title":"..."},"comments":[{"id":"comment-1","body":"..."}]}
```

Issue không tồn tại trả `404`.

### `POST /api/issues/{issueId}/comments`

Yêu cầu `IssueComment`; dịch vụ ghi đè `id` và `issueId`, `authorType` mặc định `member`. `body` phải không trống. Thành công `200 {"ok":true}`; Issue không tồn tại `404`; lỗi lưu trữ `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"authorId":"u-1","body":"验收范围已确认"}' \
  "$AGENTFLOW_URL/api/issues/issue-1/comments"
```

### `GET /api/issues/{issueId}/runs`

Trả mảng tóm tắt run của Issue, sắp thời gian giảm dần, `200`; Issue không tồn tại `404`. Tóm tắt bỏ nội dung artifacts, telemetry, nhật ký, sự kiện và workflow snapshot, đồng thời cắt bớt một số văn bản.

## Làm rõ nhiều lượt bằng AI

### `POST /api/chat-clarify`

Làm rõ yêu cầu chưa lưu. Bắt buộc `projectId` và phải tồn tại; các trường yêu cầu:

```json
{
  "projectId":"platform",
  "repositoryId":"repo-platform",
  "title":"增加审计日志",
  "description":"记录配置变更",
  "message":"需要覆盖项目配置",
  "history":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]
}
```

### `POST /api/issues/{issueId}/chat-clarify`

Cùng cấu trúc yêu cầu, dùng Issue đã lưu làm ngữ cảnh; Issue không tồn tại `404`.

Làm rõ Issue đã lưu thực thi trong **tác vụ nền phía máy chủ**: trình duyệt ngắt kết nối, đóng trang hoặc nhấp ngoài ngăn chi tiết đều không hủy. Giao diện vẫn có thể dùng SSE xem quá trình suy luận; `GET` cùng đường dẫn (`Accept: text/event-stream`) có thể kết nối lại tác vụ đang chạy. `POST /api/issues/{issueId}/chat-clarify/cancel` chỉ hủy mục công việc này. Chỉ người dùng khởi động làm rõ; nhập, tạo mới và đồng bộ đều không tự khởi động; khi dịch vụ khởi động lại, chỉ tiếp tục lượt đang phân tích trước khi khởi động lại.

Làm rõ chỉ xoay quanh chính mục công việc: tiêu đề và mô tả xác định phạm vi; chức năng lân cận thấy trong mã và yêu cầu mới phát sinh từ câu trả lời không bị hỏi thêm, chỉ liệt kê một dòng trong phần “Ngoài phạm vi lần này” của kết luận. Khi chi tiết còn lại có thể giả định theo quy ước mã hiện có, trực tiếp đưa kết luận (`ready=true`); sau nhiều lượt liên tiếp sẽ chủ động hội tụ.

Tối đa 10 phút. Chế độ phản hồi:

1. JSON thông thường: không đặt SSE `Accept`. Thành công `200` trả (khi client ngắt sớm, tác vụ vẫn tiếp tục, phản hồi có thể bị cắt):

```json
   {"result":"原始模型结果","parsed":{"summary":"...","questions":[],"ready":true},"repository":{"id":"repo-platform","analyzed":true},"issue":{}}
   ```

2. SSE: gửi `Accept: text/event-stream`. Phản hồi `200 text/event-stream`, sự kiện có thể lần lượt là:
   - `open`: `{"repository":{...}}`
   - `thought`: `{"kind":"thinking","text":"..."}` hoặc `{"kind":"tool","tool":"Read","detail":"file.go"}`
   - `done`: gồm `result`, `parsed`, `repository` và `issue` đã lưu bền vững
   - `error`: `{"error":"..."}`. Lưu ý header phản hồi đã là `200`, lỗi trong luồng không đổi thành HTTP 5xx.

Ở chế độ thường, lỗi trường/dự án `400`, thực thi thất bại `500`, hết thời gian `504`. Kéo kho mã thất bại sẽ giảm cấp và giải thích trong `repository.reason`, không nhất thiết làm yêu cầu thất bại.

```bash
curl -N -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  -H 'Accept: text/event-stream' -H 'Content-Type: application/json' \
  -d '{"projectId":"platform","title":"增加审计日志","description":"记录配置变更"}' \
  "$AGENTFLOW_URL/api/chat-clarify"
```

### `POST /api/chat-clarify/cancel`

Không có thân yêu cầu. Hủy mọi yêu cầu làm rõ đang thực thi trên instance hiện tại, trả `200 {"cancelled":true}`. Đây không phải thao tác hủy theo người dùng hoặc ID làm rõ.

## Điều phối, mở lại và tác vụ

### `POST /api/issues/{issueId}/dispatch`

Khởi chạy SOP đã liên kết. Có thể bỏ thân yêu cầu; tùy chọn:

```json
{"rerun":false}
```

Thành công `201` trả `Task` gồm `id`, `issueId`, `workflowId`, `runId`, `status`, `dispatchMode`, `triggerOrigin` và `repository` đã cố định.

- Điều phối thủ công lần đầu tạo primary task có định danh xác định.
- Khi đã thực thi, phải chỉ rõ `rerun:true`, lúc này tạo task mới; khi chưa thực thi mà truyền `rerun:true` trả `400`.
- Workflow được phân giải theo thứ tự Issue, mặc định nguồn/loại, mặc định dự án; vẫn trống trả `400`.
- Các trạng thái như đã chạy, yêu cầu nhập thủ công/tạo mới chưa vượt qua làm rõ, bàn giao đã khóa hoặc Gongfeng Issue bên ngoài đã đóng trả `409`. Yêu cầu đồng bộ từ bên ngoài không qua điểm kiểm soát làm rõ, có thể điều phối trực tiếp.
- Issue không tồn tại `404`; thực thi bị tắt ở instance có thể trả `403`; lỗi engine khác thường `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' -d '{"rerun":true}' \
  "$AGENTFLOW_URL/api/issues/issue-1/dispatch"
```

Đây là endpoint “khởi chạy” tác vụ dài, chỉ chờ tạo run, không chờ SOP hoàn tất. Sau đó dùng `/api/runs/{runId}/stream` hoặc thăm dò run.

### `POST /api/issues/{issueId}/reopen`

Mở lại rõ ràng Issue đã bàn giao, thành công `200` trả Issue đã cập nhật. Không thể mở lại `409`; Issue không tồn tại `404`.

### `GET /api/tasks`

Làm mới và trả toàn bộ `Task[]`, `200`, không phân trang. Trạng thái Task được ánh xạ từ run thành `running|completed|failed|cancelled`; giai đoạn Issue liên kết cũng cập nhật đồng bộ.

### `GET /api/tasks/{id}`

Làm mới trạng thái rồi trả một `Task`; không tồn tại trả `404 {"error":"task not found"}`.
