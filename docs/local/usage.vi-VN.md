# Sử dụng LoopForge Local

[English](usage.md) | [简体中文](usage.zh-CN.md) | Tiếng Việt

> **Phiên bản cũ (Legacy).** LoopForge Local chạy các quy trình Classic và Portable tích hợp bên trong trợ lý lập trình của bạn mà không cần máy chủ LoopForge. Bạn có thể tiếp tục dùng phiên bản đã phát hành cho các dự án hiện có.

## Kết nối LoopForge qua MCP

Dùng CodeBuddy với một instance LoopForge đang chạy để truy cập các dự án, SOP và lượt chạy trên instance đó. Nếu cần một instance, xem [hướng dẫn triển khai](../deployment.vi-VN.md).

1. Đăng nhập LoopForge và mở **Access** (接入方式). Tạo token truy cập cá nhân và chọn **CodeBuddy** để xem hướng dẫn thiết lập MCP.
2. Áp dụng cấu hình cấp người dùng trong CodeBuddy và xác nhận máy chủ `agentflow` đã kết nối trong cài đặt MCP. Yêu cầu CodeBuddy liệt kê các dự án LoopForge để kiểm tra quyền truy cập.

Xem [tham chiếu API MCP](../api/README.vi-VN.md#khám-phá-năng-lực-công-khai-và-mcp) để biết endpoint và thao tác khả dụng.

## Bắt đầu nhanh

Yêu cầu Node.js 20+ và Python 3.8+. Thay `X.Y.Z` trong các lệnh bên dưới bằng phiên bản đã phát hành dành cho tác tử và edition bạn dùng. Liệt kê các phiên bản đã phát hành bằng `npm view loopforge-cli versions --json`. Hỗ trợ host phụ thuộc phiên bản cài đặt.

| Tác tử | Cài đặt | Bắt đầu quy trình |
| --- | --- | --- |
| CodeBuddy | `npx -y loopforge-cli@X.Y.Z install codebuddy` | `/start-devflow "<request>"` |
| Codex | `npx -y loopforge-cli@X.Y.Z install codex` | `$devflow-codex "<request>"` |
| Cursor | `npx -y loopforge-cli@X.Y.Z install cursor` | `/start-devflow "<request>"` |
| Claude Code | `npx -y loopforge-cli@X.Y.Z install claude` | `/start-devflow "<request>"` |
| DeepSeek Harness | `npx -y loopforge-cli@X.Y.Z skills install dsh` | `/devflow "<request>"` |
| Hermes Agent | `npx -y loopforge-cli@X.Y.Z skills install hermes` sau đó `hermes skills trust .` | `/devflow "<request>"` |

Ví dụ với Claude Code:

```bash
npx -y loopforge-cli@X.Y.Z install claude
npx -y loopforge-cli@X.Y.Z status claude
```

```text
/start-devflow "add status filtering to the order list and cover the API with tests"
```

Kiểm tra bất kỳ bản cài đặt nào bằng `npx -y loopforge-cli@X.Y.Z status <agent>`. Nếu cài đặt hoặc thực thi thất bại, chẩn đoán môi trường:

```bash
npx -y loopforge-cli@X.Y.Z doctor
```

Pi, DeepSeek Harness và Hermes Agent được hỗ trợ qua [Portable Edition](#portable-edition). DSH có [plugin](../../local/dsh-plugin/README.md) tùy chọn cho điều khiển tác vụ, trạng thái, sản phẩm đầu ra và điểm phê duyệt. Hermes dùng cơ chế khám phá Agent Skills cục bộ của dự án và công cụ `delegate_task`; không sửa `~/.hermes/config.yaml`. Người dùng Hermes có thể tùy chọn cài [plugin Hermes](../../local/hermes-plugin/README.md) gốc để có các điều khiển `/loopforge status`, `/loopforge result` và `/loopforge approve` tương tự.

## Cách hoạt động

1. **Hiểu vấn đề trước:** tác tử khảo sát dự án và làm rõ mục tiêu, phạm vi, tiêu chí nghiệm thu thay vì viết mã ngay.
2. **Xác nhận ranh giới trước triển khai:** tác vụ vừa và lớn chỉ chuyển sang thiết kế và triển khai sau khi bạn xác nhận mục tiêu, phạm vi, phần loại trừ, quyết định quan trọng và tiêu chí nghiệm thu.
3. **Phân tách trách nhiệm:** thiết kế, triển khai, rà soát và kiểm thử được thực hiện lần lượt bởi các vai trò có trách nhiệm độc lập, giảm thiên kiến tự rà soát trong một ngữ cảnh.
4. **Đưa ra bằng chứng, không chỉ diff:** yêu cầu, kế hoạch, thay đổi, phát hiện khi rà soát và kết quả kiểm thử được lưu để kiểm tra, bàn giao và nhìn lại.
5. **Tiếp tục sau gián đoạn:** trạng thái quy trình được lưu bền vững để phiên tiếp theo tiếp tục từ giai đoạn chưa hoàn tất thay vì làm lại từ đầu.

LoopForge chọn hướng xử lý theo độ phức tạp của tác vụ. Thay đổi nhỏ đi theo luồng rút gọn một vai trò; quy trình đầy đủ theo vai trò dành cho tác vụ vừa và lớn cần đến nó.

```text
Yêu cầu của bạn
   │
   ├─ Thay đổi nhỏ ───────> Hiểu → triển khai → xác minh → bàn giao
   │
   └─ Tác vụ vừa/lớn ─────> Làm rõ và xác nhận → thiết kế → triển khai
                                                → rà soát độc lập → kiểm thử → bàn giao
                              │
                              └── Trạng thái và sản phẩm đầu ra được lưu xuyên suốt
```

## Tác tử được hỗ trợ

| Tác tử | Classic Edition (mặc định) | Portable Edition |
| --- | --- | --- |
| CodeBuddy | ✓ | ✓ |
| Codex | ✓ | ✓ |
| Cursor | ✓ | ✓ |
| Claude Code | ✓ | ✓ |
| Pi | — | ✓ |
| DeepSeek Harness | — | ✓ |
| Hermes Agent | — | ✓ |

LoopForge chỉ bật một edition cho mỗi tác tử lập trình trong từng dự án. Xem [Lựa chọn edition](editions.vi-VN.md) để biết khác biệt và cấu trúc thư mục.

## Kết quả nhận được

Khi tác vụ kết thúc, bạn nhận được thay đổi mã cùng yêu cầu đã xác nhận, thiết kế kỹ thuật, phát hiện từ rà soát độc lập, kết quả kiểm thử và tóm tắt bàn giao. LoopForge mặc định lưu lịch sử này trong `artifacts/{task_slug}/` để kiểm tra, bàn giao và nhìn lại.

<details>
<summary>Xem cấu trúc sản phẩm đầu ra mặc định</summary>

Một số tên thư mục khác nhau giữa các edition.

```text
01-requirement/   Mục tiêu, phạm vi và tiêu chí nghiệm thu đã xác nhận
02-design/        Thiết kế kỹ thuật và kế hoạch thực thi
03-code/          Thay đổi mã và báo cáo rà soát độc lập
04-e2e/           Kết quả kiểm thử
05-knowledge/     Tri thức dự án có thể tái sử dụng
workflow-summary.md
```

</details>

Tiếp tục quy trình Classic bị gián đoạn bằng `/resume-devflow {task_slug}` trên CodeBuddy, Cursor hoặc Claude Code, và `$devflow-codex resume {task_slug}` trên Codex. Mỗi gói host đã cài có tài liệu về lệnh trạng thái, hủy và từng giai đoạn.

## Quan sát cách tác tử làm việc

Classic Edition cho CodeBuddy có bảng điều khiển quan sát cục bộ. Nó chuyển bằng chứng quy trình thành màn hình hoạt động phiên, xu hướng token và chi phí, sử dụng Skill/Rule, phân công vai trò và quy thuộc theo giai đoạn Devflow — hữu ích để tìm lượt chạy tốn kém, kiểm tra tự động hóa có thực sự được dùng hay không và rà soát cách công việc chuyển giữa các vai trò.

![Bảng điều khiển quan sát tác tử cục bộ LoopForge với dữ liệu minh họa](assets/agent-observability-dashboard.png)

_Ví dụ bảng điều khiển dùng dữ liệu minh họa tổng hợp._

Bảng điều khiển được tạo và phục vụ cục bộ; không cần dịch vụ telemetry bên ngoài. Nhật ký runtime có thể chứa đối số công cụ và đoạn trích đầu ra, vì vậy LoopForge mặc định loại chúng khỏi Git và không nên chia sẻ nếu chưa rà soát.

<details>
<summary>Mở bảng điều khiển cục bộ</summary>

Sau khi chạy ít nhất một phiên CodeBuddy từ thư mục gốc dự án:

```bash
python3 .codebuddy/skills/agent-observability/scripts/build_dashboard_data.py --project-root .
python3 -m http.server 8765 --directory .codebuddy/skills/agent-observability/scripts/dashboard
```

Mở `http://localhost:8765`. Xem [hướng dẫn quan sát nhanh](../../local/.codebuddy/skills/agent-observability/references/quickstart.md) để biết nguồn dữ liệu, định giá tùy chỉnh và xử lý sự cố.

</details>

## Khi nào LoopForge hữu ích

LoopForge đặc biệt hữu ích khi:

- yêu cầu còn mơ hồ, cần làm rõ mục tiêu hoặc ranh giới;
- thay đổi trải qua nhiều module và cần thiết kế trước triển khai;
- triển khai, rà soát và kiểm thử nên do các vai trò riêng đảm nhiệm;
- công việc có thể trải qua nhiều phiên và cần trạng thái có thể tiếp tục;
- nhóm muốn hồ sơ bàn giao có thể kiểm tra để chuyển giao hoặc nhìn lại.

Với việc hoàn thành mã một lần hoặc một chỉnh sửa rất nhỏ đã đặc tả đầy đủ, dùng trực tiếp tác tử lập trình thường là đủ. Tác vụ đơn giản đi vào LoopForge sử dụng hướng rút gọn của nó.

## Portable Edition

Dùng Portable Edition cho quy trình Agent Skills có thể di chuyển giữa các host. Để tránh một tác tử lập trình tải hai quy trình và trộn trạng thái hoặc sản phẩm đầu ra, LoopForge chỉ bật một edition cho mỗi tác tử trong từng dự án. Để chuyển edition, chạy lệnh cài mới với `--force`.

| Tác tử | Cài đặt | Bắt đầu quy trình |
| --- | --- | --- |
| CodeBuddy | `npx -y loopforge-cli@X.Y.Z skills install codebuddy` | `/devflow "<request>"` |
| Codex | `npx -y loopforge-cli@X.Y.Z skills install codex` | `$devflow "<request>"` |
| Cursor | `npx -y loopforge-cli@X.Y.Z skills install cursor` | `/devflow "<request>"` |
| Claude Code | `npx -y loopforge-cli@X.Y.Z skills install claude` | `/devflow "<request>"` |
| Pi | `npx -y loopforge-cli@X.Y.Z skills install pi`, sau đó `pi install npm:pi-subagents` | `/skill:devflow "<request>"` |
| DeepSeek Harness | `npx -y loopforge-cli@X.Y.Z skills install dsh` | `/devflow "<request>"` |
| Hermes Agent | `npx -y loopforge-cli@X.Y.Z skills install hermes`, sau đó `hermes skills trust .` | `/devflow "<request>"` (plugin tùy chọn: `/loopforge`) |

Xem [Lựa chọn edition](editions.vi-VN.md) để biết đầy đủ ranh giới và cấu trúc thư mục.

## Cập nhật và gỡ cài đặt

Trước khi chuyển sang MCP nền tảng hoặc gỡ Local, sao lưu `artifacts/`, `.devflow/` của dự án và mọi skill cùng cấu hình tác tử đã tùy chỉnh. Giữ các tệp này làm hồ sơ lượt chạy Local. Dùng cùng phiên bản Local để hoàn tất hoặc tiếp tục các lượt chạy đang dang dở.

Để quản lý bản cài Local hiện có, bạn có thể cài cùng phiên bản CLI ở cấp toàn cục.

```bash
npm install --global loopforge-cli@X.Y.Z
```

Sau đó bảo trì bản cài bằng tên tác tử như trên (`codebuddy`, `codex`, `cursor`, `claude`, `pi`, `dsh`, và `hermes` đối với Portable Edition):

```bash
# Classic Edition
loopforge update <agent>
loopforge status <agent>
loopforge uninstall <agent>

# Portable Edition
loopforge skills update <agent>
loopforge skills status <agent>
loopforge skills uninstall <agent>
```

Trạng thái cài đặt được lưu trong `.devflow/install-state.json`. Cập nhật sẽ dừng thay vì ghi đè tệp đã chỉnh sửa bởi người dùng hoặc tệp xung đột. Chỉ dùng `--force` khi chủ đích thay thế xung đột hoặc chuyển edition, tốt nhất sau khi kiểm tra `loopforge plan`.

Để cài từ mã nguồn của bản phát hành, checkout tag tương ứng và chạy từ thư mục gốc kho mã:

```bash
pipx install ./local
```

## Công cụ tùy chọn

`tools/tcmcp` là trình khởi tạo MCP chỉ đọc cho Tencent Cloud (Redis, CDB, TDSQL-C, TKE, CLS, COS). Nó không thuộc `loopforge install` hoặc gói CLI npm. Từ bản clone:

```bash
cd local/tools/tcmcp
```

Sau đó thực hiện theo [`tools/tcmcp/README.md`](../../local/tools/tcmcp/README.md). API key đám mây không được ghi vào ZIP sinh ra hoặc container image; chúng ở trên máy liệt kê tài nguyên hoặc cài MCP client. Các bản LoopForge Local `local-vX.Y.Z` phát hành `ghcr.io/tencent/loopforge-tcmcp:<version>`.

## Quyền hạn và bảo mật

Một số cấu hình host Classic bật thực thi tự động hoặc chế độ tác tử có quyền cao. Chỉ dùng LoopForge trong dự án đáng tin cậy. Trước khi cài, kiểm tra các tệp dự kiến bằng `loopforge plan codebuddy`, `loopforge plan codex`, `loopforge plan cursor` hoặc `loopforge plan claude`. Không đưa thông tin xác thực, endpoint riêng tư hoặc cấu hình vận hành production vào mẫu quy trình.

Xem [Chính sách bảo mật](../../SECURITY.vi-VN.md) và báo cáo lỗ hổng riêng tư qua GitHub Security Advisories.
