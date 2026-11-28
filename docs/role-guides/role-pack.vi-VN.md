# Nhập và xuất Role Pack trong LoopForge

Role Pack giúp tạo một hoặc nhiều Role đã cấu hình sẵn mà không phải nhập thủ công từng tab. Tính năng này dùng **API hiện có** `PUT /api/agents`, không sửa database hoặc các bước tạo Role/SOP trước đây.

## Cách sử dụng

1. Mở **Vai trò** trong LoopForge và chọn **dự án đích** ở thanh chọn dự án.
2. Nhấn **Nhập Role Pack** và chọn tệp `.json` (không quá 1 MiB, tối đa 50 Role).
3. Xem danh sách Role, lỗi tham chiếu và cảnh báo. Bản xem trước không ghi dữ liệu.
4. Đọc prompt, Shell/Python hook và lệnh nghiệm thu trong tệp. Đánh dấu xác nhận đã kiểm tra.
5. Nhấn **Xác nhận nhập**. Thành công, các Role mới xuất hiện trong dự án và có thể gắn vào SOP.

Có nút **Xuất Role Pack** để tải tất cả Role thuộc dự án hiện tại vào một tệp JSON. Chương trình lấy bản mới nhất từ server trước khi xuất. **Hãy đọc lại file trước khi chia sẻ**, vì prompt, hook và lệnh kiểm tra có thể chứa thông tin nhạy cảm.

**Tệp mẫu:** [Engineering Lead](engineering-lead.role-pack.json). Bạn có thể tải về, điều chỉnh `id`, `model`, `prompt` rồi nhập. Ví dụ mặc định dùng `executorId: "claude"` và `model: "auto/best-coding"`; chỉ dùng nếu instance của bạn đã cấu hình đúng CLI và model OmniRouter.

## Định dạng

```json
{
  "format": "loopforge-role-pack",
  "schemaVersion": 1,
  "roles": [
    {
      "id": "architect",
      "name": "Solution Architect",
      "description": "Thiết kế giải pháp",
      "executorId": "claude",
      "model": "auto/best-coding",
      "prompt": "Nhiệm vụ: {{input}}",
      "rules": [],
      "skills": [],
      "mcpServers": [],
      "platformMcp": false,
      "knowledgeBase": false,
      "hooks": [],
      "artifactOutputs": [
        {
          "name": "Architecture decision",
          "path": "architecture/decision.md",
          "mediaType": "text/markdown",
          "required": true
        }
      ],
      "verification": [
        {
          "id": "check-decision",
          "name": "Validate output",
          "mode": "command",
          "commands": ["test -s architecture/decision.md"],
          "onFailure": "loop",
          "executionScope": "run"
        }
      ],
      "loop": {
        "enabled": true,
        "maxIterations": 2,
        "exitCondition": "all_gates_pass",
        "onExhausted": "human"
      },
      "interventions": [
        {
          "id": "approve-plan",
          "name": "Plan review",
          "stage": "after_execution",
          "required": true
        }
      ]
    }
  ]
}
```

`schemaVersion` là phiên bản của **định dạng Role Pack**, không phải phiên bản Role. Những trường Role còn lại tuân theo `domain.AgentDefinition` của phiên bản LoopForge hiện tại. Không nhập `projectId`, `shared`, `version`, `updatedAt` trong mỗi Role: importer gán `projectId` cho dự án đang chọn, khởi tạo `version: 1`, đặt `shared: false`. Phần mềm không dùng bản xuất để ghi đè Role hiện có.

## Thông tin được bảo toàn

- Tên, ID, trách nhiệm, prompt (`{{input}}`, `{{feedback}}`, v.v.).
- CLI, model, mức suy luận.
- Tham chiếu Rule, Skill, MCP; hai công tắc Platform MCP và Knowledge Base.
- Chính sách loop, kiểm tra thất bại và phản hồi sửa lại.
- Danh sách đường dẫn sản phẩm đầu ra (`artifactOutputs`) cùng MIME type, ví dụ `text/markdown` hoặc `video/mp4`.
- Lệnh nghiệm thu, hook Shell/Python và checkpoint phê duyệt.

## Những gì **không** được nhập

Role Pack **không chứa nội dung thực tế** của các tệp sẽ được Agent tạo ra, không nhúng/giải nén thư mục Skill hoặc tệp `SKILL.md`, không cài MCP, không đưa API key, không tự khởi chạy SOP, không chạy hook hay lệnh nghiệm thu lúc nhập. Các `artifactOutputs.path` chỉ là hợp đồng đầu ra trong workspace khi Role được chạy về sau.

Để dùng Rule, Skill hoặc MCP, những tài nguyên được tham chiếu qua ID **phải tồn tại và truy cập được trong dự án**. Nếu thiếu hoặc có xung đột ID, preflight dừng toàn bộ gói trước khi ghi.

## Xử lý lỗi, phạm vi và giới hạn

- **Không ghi đè:** nếu Role ID đã tồn tại ở bất kỳ dự án nào được API trả về, importer từ chối nhập. Trường hợp tên hiển thị giống một Role hiện có sẽ có cảnh báo.
- **Nhập riêng tư:** Role mới mặc định chỉ thuộc dự án đích, không tự chia sẻ sang dự án khác.
- **Ghi tuần tự, không atomic:** các API hiện có tạo từng Role. Nếu role thứ 4/10 thất bại, ba Role đầu vẫn tồn tại. Giao diện chỉ rõ số đã nhập, ID bị lỗi và không tự hoàn tác; có thể sửa gói, loại bỏ các ID đã tạo rồi nhập lại. Không có rollback ngầm.
- **Không có cam kết chống race condition ở cấp server:** importer kiểm tra ID hai lần trước khi ghi nhưng endpoint `PUT /api/agents` hiện tại có semantics upsert. Khi nhiều người đồng thời tạo cùng ID, vẫn cần cơ chế create-only/transaction ở backend để bảo đảm tuyệt đối. Không dùng tính năng này làm thao tác đồng bộ dữ liệu đa người viết có yêu cầu atomic.
- **Kiểm tra trước khi tin tưởng:** tệp JSON không chứa secret fields; importer bác trường ngoài schema. Nhưng prompt và shell script là nội dung không đáng tin nếu lấy từ nguồn khác; hãy tự rà soát trước khi chọn xác nhận.
- **Tương thích:** chỉ `schemaVersion: 1`. Tệp dùng phiên bản khác hoặc trường không hỗ trợ sẽ báo lỗi thay vì làm mất dữ liệu không rõ nghĩa.

## Khắc phục nhanh

| Lỗi | Cách xử lý |
| --- | --- |
| ID đã tồn tại | Sửa `id` của Role trong JSON hoặc loại bỏ Role khỏi gói; importer không overwrite |
| Không tìm thấy Rule/Skill/MCP | Cài hoặc chia sẻ tài nguyên cần thiết trước; hoặc bỏ ID tham chiếu khỏi JSON nếu thực sự không sử dụng |
| Executor không khả dụng | Chọn đúng CLI đã cài/cấu hình; với Claude Code, thường là `claude` |
| API từ chối model/effort | Kiểm tra model trong cài đặt CLI/OmniRouter và nấc suy luận mà executor hỗ trợ |
| Nhập một phần | Xem số lượng đã tạo, sửa gói còn lại và tránh nhập lại các ID đã được ghi |
| Role tạo được nhưng không chạy | Kiểm tra Runner, quyền, credentials, model, Skills/MCP và liên kết Role → SOP |

## Vì sao làm theo cách này?

Module mới nằm riêng tại `web/app/role-pack.js`, style trong `web/app/role-pack.css`; chỉ thêm nút và modal ở `web/index.html`. Điều này giữ nguyên cấu trúc API/DB, giảm bề mặt thay đổi và nguy cơ conflict khi đồng bộ upstream. Các kiểm thử tự động nằm ở `web/role_pack_test.js` và `web/role_pack_test.go`.
