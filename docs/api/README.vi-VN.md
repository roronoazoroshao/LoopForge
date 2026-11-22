# API HTTP LoopForge

Tài liệu dựa trên hiện thực hiện tại của `internal/httpapi/server.go`, `dispatch.go`, `schedule.go`. API chia theo miền:

- [Cộng tác và yêu cầu](collaboration.md): dự án, kho mã, Issue, bình luận, làm rõ và tác vụ.
- [Danh mục năng lực](registry.md): Agent, quy tắc, Skill, MCP, trình thực thi, môi trường và cấu hình sandbox.
- [Điều phối và thực thi](orchestration.md): SOP, lượt chạy, phê duyệt, nhật ký, sản phẩm đầu ra, phân tích và tác vụ theo lịch.
- [Tác vụ AI theo lịch dùng chung và đăng ký](shared-schedules.vi-VN.md): phiên bản phát hành, tham số nghiệp vụ, thực thi độc lập và nâng cấp thủ công.
- [Đồng bộ bên ngoài](sync.md): đồng bộ Gongfeng/TAPD.

## Quy ước cơ bản

- URL cơ sở ví dụ: `http://127.0.0.1:8090`.
- Trừ tải xuống và SSE, yêu cầu và phản hồi đều là JSON UTF-8. Yêu cầu ghi dùng `Content-Type: application/json`.
- Giới hạn body JSON là 2 MiB.
- Thời gian dùng RFC 3339, ví dụ `2026-09-02T12:00:00Z`.
- Dịch vụ có thể bật gzip cho phản hồi thông thường; client có thể gửi `Accept-Encoding: gzip`. Phản hồi SSE, OTLP và yêu cầu rõ `text/event-stream` không nén.
- Trừ nhật ký/telemetry lượt chạy, giao diện danh sách trả toàn bộ mảng, không có phân trang chung.
- Trình duyệt chỉ cho phép truy cập chéo với cùng host API; yêu cầu khác origin trả `403`. Preflight `OPTIONS` trả `204`.

### Xác thực

Sau khi đặt `AGENTFLOW_AUTH_REQUIRED=true` trong production:

- Studio dùng HttpOnly Cookie được cấp sau đăng nhập mật khẩu tại `/login.html`; `POST /api/auth/password` cần Origin cùng nguồn và JSON `{login,password}`.
- Người dùng đã đăng nhập xin Token cá nhân tại «Phương thức truy cập → Token của tôi»; REST API và MCP dùng `Authorization: Bearer afp_<token>`.
- Token dạng rõ chỉ được hiển thị một lần, hỗ trợ thời hạn, lần sử dụng gần nhất và thu hồi ngay.
- `GET/POST /api/auth/tokens`, `DELETE /api/auth/tokens/{id}` chỉ chấp nhận Cookie đăng nhập, không cho Bearer Token tự tạo thêm Token.
- Thông tin xác thực thiếu, hết hạn hoặc đã thu hồi trả `401` kèm `WWW-Authenticate: Bearer realm="AgentFlow"`.
- `-basic-user` / `-basic-pass` là Basic Auth vòng ngoài tương thích triển khai cũ.
- Ví dụ dùng biến môi trường thống nhất để tránh ghi thông tin xác thực vào lịch sử:

```bash
export AGENTFLOW_URL=http://127.0.0.1:8090
export AGENTFLOW_TOKEN='afp_xxx'
curl -H "Authorization: Bearer $AGENTFLOW_TOKEN" "$AGENTFLOW_URL/api/health"
```

### Phản hồi chung và mã trạng thái

Lỗi thường có dạng:

```json
{"error":"错误说明"}
```

- `200 OK`: đọc, cập nhật, thao tác thành công; một số giao diện ghi trả `{"ok":true}`.
- `201 Created`: tạo lượt chạy, điều phối tác vụ hoặc clone SOP thành công.
- `204 No Content`: xóa SOP hoặc CORS preflight thành công.
- `400 Bad Request`: JSON không hợp lệ, thiếu trường, tham chiếu không hợp lệ hoặc tham số nghiệp vụ sai.
- `401 Unauthorized`: Basic Auth thất bại.
- `403 Forbidden`: yêu cầu khác origin bị từ chối hoặc instance hiện tại tắt thực thi.
- `404 Not Found`: tài nguyên hoặc đường dẫn con không tồn tại.
- `405 Method Not Allowed`: đường dẫn tồn tại nhưng không hỗ trợ phương thức.
- `409 Conflict`: xung đột phiên bản, trạng thái không cho phép, điều phối trùng lặp, tài nguyên đang chạy ngăn xóa hoặc scheduler tắt.
- `500 Internal Server Error`: không hỗ trợ đầu ra streaming hoặc trình thực thi làm rõ thất bại.
- `504 Gateway Timeout`: AI làm rõ vượt quá 10 phút.

Lưu ý: phần lớn lỗi tầng lưu trữ/bộ máy thực thi hiện được ánh xạ thành `400`, không phải `500`. Một số giao diện đăng ký `PUT` cần `id`, thiếu trường này hiện có thể trả `200` rỗng; bên gọi vẫn phải coi `id` là bắt buộc.

## Chỉ mục API

### Chung

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/health` | Kiểm tra sức khỏe, trả về `{"status":"ok","role":"api"}` |
| `GET` | `/api/capabilities` | Liệt kê thao tác HTTP/MCP công khai |
| `GET` | `/api/bootstrap` | Lấy danh mục khởi tạo Studio và thông tin lưu trữ trong một lần |
| `POST`, `DELETE` | `/mcp` | Điểm vào MCP Streamable HTTP không trạng thái |

### Cộng tác và yêu cầu

| Phương thức | Đường dẫn |
|---|---|
| `GET`, `POST`, `PUT` | `/api/projects` |
| `GET` | `/api/projects/{id}` |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/repositories` |
| `GET` | `/api/repositories/{id}` |
| `GET`, `POST`, `PUT` | `/api/issues` |
| `GET` | `/api/issues/{issueId}` |
| `POST` | `/api/issues/{issueId}/comments` |
| `GET` | `/api/issues/{issueId}/runs` |
| `POST` | `/api/issues/{issueId}/chat-clarify` |
| `POST` | `/api/issues/{issueId}/reopen` |
| `POST` | `/api/issues/{issueId}/dispatch` |
| `POST` | `/api/chat-clarify` |
| `POST` | `/api/chat-clarify/cancel` |
| `GET` | `/api/tasks` |
| `GET` | `/api/tasks/{id}` |

### Danh mục năng lực

| Phương thức | Đường dẫn |
|---|---|
| `GET`, `PUT` | `/api/agents` |
| `GET` | `/api/agents/{id}` |
| `DELETE` | `/api/agents/{id}` |
| `GET` | `/api/agents/{id}/revisions` |
| `GET` | `/api/agents/{id}/revisions/{revisionId}` |
| `POST` | `/api/agents/{id}/revisions/{revisionId}/restore` |
| `GET`, `PUT`, `DELETE` | `/api/rules` |
| `GET`, `PUT`, `DELETE` | `/api/skills` |
| `GET`, `PUT` | `/api/mcp-servers` |
| `POST` | `/api/mcp-servers/import` |
| `GET` | `/api/executors` |
| `GET`, `PUT`, `DELETE` | `/api/dockerfiles` |
| `GET`, `PUT`, `DELETE` | `/api/environments` |
| `GET`, `PUT`, `DELETE` | `/api/sandboxes` |

### Điều phối, thực thi và quan sát

| Phương thức | Đường dẫn |
|---|---|
| `GET`, `PUT` | `/api/workflows` |
| `GET`, `DELETE` | `/api/workflows/{id}` |
| `GET` | `/api/workflows/{id}/revisions` |
| `GET` | `/api/workflows/{id}/revisions/{revisionId}` |
| `POST` | `/api/workflows/{id}/revisions/{revisionId}/restore` |
| `POST` | `/api/workflows/{id}/publish` |
| `POST` | `/api/workflows/{id}/clone` |
| `GET` | `/api/workflow-metrics` |
| `GET` | `/api/analytics` |
| `GET` | `/api/observability/spec` |
| `GET`, `POST` | `/api/runs` |
| `GET`, `DELETE` | `/api/runs/{runId}` |
| `GET` | `/api/runs/{runId}/stream` |
| `GET` | `/api/runs/{runId}/wait` |
| `GET` | `/api/runs/{runId}/logs` |
| `GET` | `/api/runs/{runId}/logs.txt` |
| `GET` | `/api/runs/{runId}/telemetry` |
| `GET` | `/api/runs/{runId}/artifacts/{artifactId}` |
| `POST` | `/api/runs/{runId}/approve` |
| `POST` | `/api/runs/{runId}/pass` |
| `POST` | `/api/runs/{runId}/reject` |
| `POST` | `/api/runs/{runId}/retry` |
| `GET`, `POST` | `/api/runs/{runId}/workspace/restore` |
| `POST` | `/api/runs/{runId}/decline-retry` |
| `POST` | `/api/runs/{runId}/cancel` |
| `GET`, `POST`, `PUT` | `/api/schedule-jobs` |
| `DELETE` | `/api/schedule-jobs/{id}` |
| `POST` | `/api/schedule-jobs/{id}/run` |
| `POST` | `/api/schedule-jobs/{id}/enabled` |
| `GET` | `/api/schedule-job-executions` |

### Đồng bộ

| Phương thức | Đường dẫn |
|---|---|
| `GET`, `POST`, `PUT` | `/api/sync/config` |
| `POST` | `/api/sync/now` |
| `GET` | `/api/sync/logs` |
| `GET` | `/api/sync/status` |
| `POST` | `/api/sync/create` |

## Khám phá năng lực công khai và MCP

### `GET /api/capabilities`

Trả `200`:

```json
{
  "operations":[
    {"name":"projects_list","description":"List projects with secrets redacted","method":"GET","path":"/api/projects","readOnly":true}
  ],
  "mcp":{"streamableHttp":"/mcp","stdioCommand":"agentflow-mcp"}
}
```

`operations` là danh mục năng lực dùng chung cho HTTP và MCP. Nó loại trừ rõ signals, OTLP, lease và bảo trì sandbox.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" \
  "$AGENTFLOW_URL/api/capabilities"
```

### `POST /mcp`

Điểm vào MCP JSON-RPC 2.0 không trạng thái, body yêu cầu tối đa 4 MiB, hỗ trợ phiên bản giao thức `2024-11-05`, `2025-03-26`, `2025-06-18`; phiên bản khác dự phòng về `2025-06-18`. Hỗ trợ:

- `initialize`, `ping`
- `tools/list`, `tools/call`
- `resources/list`, `resources/templates/list`, `resources/read`
- `notifications/*` (trả HTTP `202`, không có phản hồi JSON-RPC)

`tools/list` được sinh từ operation manifest của `/api/capabilities`. Định dạng tham số `tools/call`:

```json
{"name":"issues_dispatch","arguments":{"path":{"id":"issue-1"},"query":{},"body":{"rerun":true}}}
```

HTTP 2xx/không 2xx ở tầng dưới lần lượt ánh xạ thành `isError:false/true` của kết quả công cụ; phản hồi JSON còn nằm trong `structuredContent.data`, trạng thái HTTP gốc trong `structuredContent.status`. Sản phẩm đầu ra và nhật ký còn đọc được qua mẫu tài nguyên `agentflow://runs/{runId}/artifacts/{artifactId}`, `agentflow://runs/{runId}/logs`.

```bash
curl -u "$AGENTFLOW_USER:$AGENTFLOW_PASS" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  "$AGENTFLOW_URL/mcp"
```

Khi JSON-RPC có phản hồi, HTTP là `200`; phân tích JSON thất bại là `400`; `GET /mcp` và phương thức không hỗ trợ khác là `405`. `DELETE /mcp` trả `204`, do dịch vụ không trạng thái nên chỉ dùng để tương thích giao thức, không hủy phiên. MCP và API công khai dùng cùng Basic Auth cấp triển khai.

## Giao diện không thuộc API công khai

Client bên ngoài không nên xem các chi tiết hiện thực sau là năng lực ổn định:

- `POST /api/runs/{runId}/signals`: điểm vào nội bộ để Worker báo envelope lên mặt phẳng điều khiển.
- `POST /api/otel/v1/traces`: điểm nhận OTLP nội bộ chỉ dùng qua loopback; ngay cả khi bật Basic Auth, gọi cục bộ có thể bỏ qua Basic Auth.
- Các trường `ownerInstanceId`, `leaseUntil`, `executionGeneration`, `workspaceHost`, `workspaceRoot` của run và `sandboxId` của nút/run: metadata lease instance và định vị thực thi, chỉ là trường chẩn đoán không cần hiểu cấu trúc.
- Thu hồi, dọn dẹp và thao tác vòng đời sandbox: hiện không có HTTP API công khai. `/api/sandboxes` chỉ quản lý mẫu cấu hình sandbox, không thực thi thu hồi.

Vì vậy bộ tài liệu này không cung cấp ví dụ gọi Worker signals, OTLP, quản lý lease hoặc thu hồi sandbox.
