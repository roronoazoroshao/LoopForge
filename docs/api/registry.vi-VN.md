# API registry năng lực

Xem xác thực và mã trạng thái chung trong [README](README.vi-VN.md). Mọi danh sách `GET` trên trang này trả mảng JSON đầy đủ, không phân trang; mọi `PUT` lưu/ghi đè theo `id`.

## Snapshot khởi tạo

### `GET /api/bootstrap`

Trả đối tượng tổng hợp cần cho khởi tạo Studio, `200`:

```json
{
  "projects":[],
  "repositories":[],
  "agents":[],
  "rules":[],
  "skills":[],
  "mcpServers":[],
  "executors":[],
  "dockerfiles":[],
  "environments":[],
  "sandboxes":[],
  "workflows":[],
  "syncConfig":{},
  "scheduleJobs":[],
  "schedulerEnabled":true,
  "storage":{"driver":"mysql","database":true,"note":"..."}
}
```

Token nhạy cảm của dự án và kho mã đã được ẩn. Agent ở đây là tóm tắt danh mục: bỏ qua trường lớn như prompt, interventions, artifactOutputs, verification, chỉ giữ định danh, tóm tắt mô tả, trình thực thi/mô hình, tham chiếu quy tắc/Skill/MCP và loop rút gọn; gọi chi tiết Agent để lấy định nghĩa đầy đủ.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" "$AGENTFLOW_URL/api/bootstrap"
```

## Agent

Các trường cốt lõi của `AgentDefinition` gồm:

```json
{
  "id":"agent-dev",
  "name":"研发 Agent",
  "version":1,
  "description":"实现研发任务",
  "prompt":"读任务输入 {{input}} 和相关源码，做最小且完整的修改……",
  "rules":["rule-secure"],
  "skills":["skill-go"],
  "mcpServers":["gongfeng"],
  "executorId":"codebuddy",
  "model":"model-name",
  "loop":{"enabled":true,"maxIterations":3,"exitCondition":"all_gates_pass","onExhausted":"human"},
  "interventions":[],
  "artifactOutputs":[],
  "verification":[]
}
```

### `GET /api/agents`

Trả toàn bộ `AgentDefinition[]`, `200`. Khi truyền `projectId`, chỉ trả vai trò dự án đó và vai trò được dự án khác chia sẻ rõ ràng; vai trò lịch sử không có dự án không được trả như vai trò toàn cục.

### `PUT /api/agents`

Bắt buộc `id`, `name`, `projectId` (khi cập nhật vai trò hiện có, có thể dùng `projectId` hiện tại của nó); `version` bằng `0` được đổi thành `1`. Thành công `200` trả Agent đã lưu; lỗi lưu trữ/phiên bản `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"id":"agent-dev","name":"研发 Agent","projectId":"platform","version":1,"rules":[],"skills":[],"mcpServers":[],"loop":{"enabled":false},"verification":[]}' \
  "$AGENTFLOW_URL/api/agents"
```

### `GET /api/agents/{id}`

Trả Agent đầy đủ, `200`; không tồn tại `404`.

### `GET /api/agents/{id}/revisions`

Trả `DefinitionRevision[]` của Agent, `200`; Agent không tồn tại `404`. Revision gồm `id`, `kind`, `entityId`, `version`, `revision`, `name`, `summary`, `payload`, `createdAt`.

### `GET /api/agents/{id}/revisions/{revisionId}`

Trả một phiên bản lịch sử thuộc Agent; trả `404` nếu không tồn tại hoặc phiên bản không thuộc Agent này.

### `POST /api/agents/{id}/revisions/{revisionId}/restore`

Không có thân yêu cầu. Thành công `200` trả Agent đã khôi phục; Agent không tồn tại `404`; revision không hợp lệ hoặc khôi phục thất bại thường là `400`.

### `DELETE /api/agents/{id}`

Xóa định nghĩa vai trò. Điều kiện trước: vai trò không được quy trình nào tham chiếu và không ở trạng thái dùng chung, nếu không trả `409` cùng lý do; thành công trả `204`; vai trò không tồn tại `404`.

## Quy tắc và Skill

### `GET /api/rules`

Trả `RuleDefinition[]`, các trường `id`, `name`, `projectId`, `shared`, `description`, `content`, `priority`, `updatedAt`, `200`. Có thể dùng tham số truy vấn `projectId` để chỉ trả tài nguyên dự án chỉ định.

### `PUT /api/rules`

Bắt buộc `id`, `name`, `projectId`. Sau khi `shared=true`, dự án khác có thể dùng chỉ đọc; không thể ngừng chia sẻ khi vẫn được vai trò dùng chung tham chiếu. Thành công `200 {"ok":true}`; thất bại `400/404/409`.

### `DELETE /api/rules?id={id}`

Xóa quy tắc. Điều kiện trước: chưa chia sẻ và không được vai trò nào tham chiếu, nếu không `409`; thành công `204`; thiếu id `400`; không tồn tại `404`.

### `GET /api/skills`

Trả `SkillDefinition[]`, các trường `id`, `name`, `projectId`, `shared`, `description`, `content`, `files`, `updatedAt`, `200`. Có thể dùng tham số truy vấn `projectId` để chỉ trả tài nguyên dự án chỉ định.

### `PUT /api/skills`

Bắt buộc `id`, `name`, `projectId`; `files` là ánh xạ từ đường dẫn tương đối tới nội dung tệp. Sau khi `shared=true`, dự án khác có thể dùng chỉ đọc; không thể ngừng chia sẻ khi vẫn được vai trò dùng chung tham chiếu. Thành công `200 {"ok":true}`; thất bại `400/404/409`.

### `DELETE /api/skills?id={id}`

Xóa kỹ năng và tệp nhị phân `skill_files` của nó. Điều kiện trước: chưa chia sẻ và không được vai trò nào tham chiếu, nếu không `409`; thành công `204`; thiếu id `400`; không tồn tại `404`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"id":"rule-secure","name":"安全规范","content":"不得提交密钥","priority":100}' \
  "$AGENTFLOW_URL/api/rules"
```

## MCP Server

Các trường `MCPServerDefinition` gồm `id`, `name`, `description`, `transport`, `command`, `args`, `workingDirectory`, `installScript`, `fileRefs`, `url`, `environment`, `headers`, `authType`, `timeoutSec`, `updatedAt`. `authType=github-token` nghĩa là khi chạy, MCP GitHub chính thức được nạp GitHub Token của người phụ trách yêu cầu; bản thân tài nguyên không được lưu token cá nhân. Nội dung tệp stdio tải lên lưu trong `mcp_files`, payload chỉ giữ danh sách `fileRefs`.

### `GET /api/mcp-servers`

Trả `MCPServerDefinition[]`, `200`.

### `PUT /api/mcp-servers`

Bắt buộc `id`. Khi `transport=http`, cần URL `http://` hoặc `https://`; khi `transport=stdio` hoặc trống, cần `command`; `timeoutSec` từ 0–600. Thành công `200 {"ok":true}` và tải lại cấu hình đồng bộ; lỗi xác thực `400`.

### `POST /api/mcp-servers/:id/files`

Tải thư mục MCP stdio hoặc ZIP, trường tệp multipart là `files`, đường dẫn tương đối thư mục truyền qua trường `paths` theo cùng thứ tự. Lô tải lên thay thế toàn bộ cây tệp MCP, nội dung lưu vào MySQL; mỗi tệp 1MB, tổng 64MB, tối đa 500 tệp. Tấn công xuyên đường dẫn ZIP, đường dẫn tuyệt đối và liên kết tượng trưng bị từ chối.

### `GET|DELETE /api/mcp-servers/:id/files/:path`

Tải xuống hoặc xóa một tệp đã tải lên. Sau xóa, làm mới đồng bộ `fileRefs` của MCP payload.

### `POST /api/mcp-servers/import`

Nhập hàng loạt. Yêu cầu có thể là:

- Một đối tượng MCP;
- Mảng đối tượng MCP;
- `{"mcpServers": ...}` hoặc `{"servers": ...}`;
- Ánh xạ đối tượng có key là server id.

Mọi mục được xác thực và lưu riêng; thành công `200`:

```json
{"imported":2,"servers":[{"id":"gongfeng","name":"工蜂","transport":"http","url":"https://..."}]}
```

JSON không hợp lệ/danh sách rỗng/lỗi xác thực mục trả `400`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '[{"id":"docs","name":"文档 MCP","transport":"http","url":"https://mcp.example.com","timeoutSec":30}]' \
  "$AGENTFLOW_URL/api/mcp-servers/import"
```

## Trình thực thi

### `GET /api/executors`

Trả danh mục CLI tích hợp chỉ đọc (CodeBuddy, Codex, Claude Code, cùng OpenCode, Cursor CLI, Antigravity, Kimi Code, Pi, DeepSeek Harness, ZCode). Không cho phép thêm hoặc sửa CLI qua API; mô hình đặt trong Agent, API Key/Base URL dùng cấu hình cá nhân của người phụ trách yêu cầu (chủ dự án nếu chưa chỉ định).

## Dockerfile, Environment và Sandbox Profile

### `GET /api/dockerfiles`

Trả `DockerfileDefinition[]`, `200`. Các trường `id`, `name`, `description`, `content`, `files`, `updatedAt`.

### `PUT /api/dockerfiles`

Bắt buộc `id`, `name`, `content`; key của `files` phải là đường dẫn tương đối an toàn. Thành công `200 {"ok":true}`; lỗi xác thực `400`.

### `DELETE /api/dockerfiles?id={id}`

Xóa Dockerfile. Điều kiện trước: chưa chia sẻ và không được sandbox nào tham chiếu, nếu không `409`; thành công `204`.

### `GET /api/environments`

Trả `EnvironmentDefinition[]`, `200`. Các trường `id`, `name`, `description`, `variables`, `pathEntries`, `installScript`, `updatedAt`.

### `PUT /api/environments`

Bắt buộc `id`, `name`; tên biến không được chứa `=`/NUL, `pathEntries` phải là đường dẫn tương đối an toàn. Thành công `200 {"ok":true}`; lỗi xác thực `400`.

### `DELETE /api/environments?id={id}`

Xóa tập lệnh cài đặt môi trường. Điều kiện trước: chưa chia sẻ và không được sandbox nào tham chiếu, nếu không `409`; thành công `204`.

### `GET /api/sandboxes`

Trả `SandboxProfile[]`, `200`. Các trường `id`, `name`, `driver` (`local|native|docker`; khi lưu `seatbelt` hoặc `bwrap` sẽ chuẩn hóa thành `native`, lúc chạy phân giải thành seatbelt trên macOS, bwrap trên Linux), `dockerfileId`, `environmentId`, `readOnlyRootFS`, `environment`.

### `PUT /api/sandboxes`

Bắt buộc `id`, thành công `200 {"ok":true}`; lỗi xác thực/lưu trữ `400`.

### `DELETE /api/sandboxes?id={id}`

Xóa cấu hình sandbox. Điều kiện trước: không phải `local` tích hợp, chưa chia sẻ và không được SOP nào tham chiếu, nếu không `409`; thành công `204`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"id":"sandbox-go","name":"Go 隔离环境","driver":"docker","dockerfileId":"go-1.23","readOnlyRootFS":false}' \
  "$AGENTFLOW_URL/api/sandboxes"
```

`/api/sandboxes` chỉ quản lý cấu hình để SOP tham chiếu, không tạo, truy vấn hay thu hồi sandbox runtime; thu hồi sandbox không phải API công khai.
