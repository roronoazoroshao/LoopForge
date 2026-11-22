# Triển khai

[Bản tiếng Anh](deployment.md) · Tiếng Việt

## Phát triển trực tiếp trên máy chủ

`bash scripts/dev.sh` cấu hình rõ ràng các bí mật cục bộ, chỉ khởi động dịch vụ MySQL của bản checkout này, build nền tảng, tạo tài khoản `admin`, cài các cột sinh tự động còn thiếu cho hệ thống quan sát thông qua tập lệnh tường minh, áp dụng `migrations/seed/*.sql` và khởi động máy chủ ở cổng 8090. Các định nghĩa danh mục hiện có được bảo toàn bằng `INSERT IGNORE`. Giữ `.env`, `.local/` và volume cơ sở dữ liệu ngoài hệ thống quản lý phiên bản.

Đối với cài đặt trực tiếp, dùng Node.js 22+ trên máy chủ API và cài CLI định sử dụng. Ví dụ với Codex:

```bash
npm install --global @openai/codex@0.162.1
codex --version
```

Cấu hình thông tin xác thực CLI trong cài đặt cá nhân. Nếu chọn CodeBuddy, dùng môi trường mạng tương ứng và đặt tệp nhị phân trên PATH hoặc đặt `AGENTFLOW_CODEBUDDY_BIN`. Image production đi kèm Codex, DeepSeek Harness và mặc định có CodeBuddy. Nếu thiếu CLI cài theo nhu cầu, cuộc trò chuyện hiển thị thao tác cài đặt. Sandbox SOP dùng image phát hành chia sẻ bản cài lần đầu của Claude Code, OpenCode, Kimi Code và Pi. Runner đã kết nối tự quản lý cài đặt CLI của chúng.

Thông báo WeCom cần `wecom-cli` trên PATH của dịch vụ nền tảng. Image build từ Dockerfile này có `@wecom/cli@1.3.4`; image đã phát hành sẽ có trong bản phát hành tiếp theo. Với cài đặt trực tiếp, cài riêng bằng `npm install --global @wecom/cli@1.3.4`, bảo đảm chứng chỉ CA hệ thống đã cài và kiểm tra `wecom-cli --version` dưới tài khoản chạy dịch vụ. Vẫn cần cấu hình Bot WeCom để gửi thông báo.

Đặt `AGENTFLOW_MANAGED_CLI_ROOT` thành thư mục tuyệt đối lưu bền vững để bật trình cập nhật CLI hằng ngày trên tiến trình nền tảng thực thi lượt chạy (`worker` hoặc `all`). Mặc định kiểm tra Claude Code, CodeBuddy và Codex. Đặt `AGENTFLOW_MANAGED_CLIS` thành danh sách đầy đủ các CLI muốn cập nhật, phân cách bằng dấu phẩy, ví dụ `claude-code,codebuddy,codex,pi`. Các ID nhà cung cấp bổ sung là `agy`, `cursor`, `dsh`, `kimi`, `opencode` và `pi`. Trình cập nhật bỏ qua mục rỗng, kể cả dấu phẩy cuối. Danh sách không có tên dùng mặc định; ID không xác định khiến cập nhật bị từ chối. Danh sách dùng cho kiểm tra theo lịch, lệnh cập nhật hàng loạt CLI và cập nhật CLI được quản lý trên Runner. Bản cài hiện có và khả năng rollback vẫn được giữ. Đặt cùng danh sách trên API và worker dùng chung thư mục gốc quản lý. API dùng danh sách khi phân giải CodeBuddy; worker nhận kiểm tra hằng ngày một lần cho mỗi thư mục gốc.

Trình cập nhật kiểm tra metadata upstream hằng ngày và tải bản phát hành đủ điều kiện khi cần. Nó xác minh tính toàn vẹn gói npm bằng Subresource Integrity (SRI) trước khi chạy tập lệnh vòng đời npm. Tệp nén Antigravity được đối chiếu SHA512 của manifest chính thức. Trình cài chính thức Cursor cung cấp URL có phiên bản nhưng không có checksum nội dung. Tính toàn vẹn tải Cursor dựa vào TLS và strong ETag khớp, là định danh không cần diễn giải do máy chủ tệp nén cung cấp. [Tập lệnh cài đặt Cursor](https://cursor.com/install)

Worker cần truy cập nguồn CLI đã chọn và có thể cấu hình `HTTPS_PROXY` khi cần. Trình cập nhật báo lỗi tải theo từng nhà cung cấp.

Mọi ứng viên đều trải qua cửa sổ quan sát 24 giờ cùng kiểm tra phiên bản và đối số CLI trước khi kích hoạt. Trình cập nhật giữ phiên bản đã cài trên đĩa để rollback và ghim phiên bản cho quy trình, nên dung lượng lưu trữ tăng theo số bản phát hành. Trước khi bật nhà cung cấp bổ sung, sao lưu thư mục gốc quản lý nếu dự định rollback bản phát hành nền tảng. Các phiên bản nền tảng cũ chấp nhận danh mục cài đặt chứa ba nhà cung cấp ban đầu. Khôi phục bản sao tương thích ở đường dẫn tuyệt đối ban đầu để bảo toàn đường dẫn tệp thực thi đã ghi. Sau rollback CLI, cập nhật tự động chờ bản phát hành mới hơn bản đã từ chối.

Khi thực thi trực tiếp, nền tảng ưu tiên đường dẫn tệp nhị phân ghi đè rõ ràng, rồi đến danh mục cài đặt được quản lý. Quy trình trực tiếp do nền tảng quản lý ghim phiên bản trong thư mục gốc quản lý. Worker tiếp nhận lượt chạy có thể dùng lại phiên bản đã ghim khi truy cập cùng thư mục bền vững ở cùng đường dẫn tuyệt đối và có tệp nhị phân tương thích. Worker có thư mục riêng phân giải CLI từ danh mục riêng.

Trình cập nhật giữ các quan sát về bản phát hành Cursor và Antigravity qua các lần kiểm tra hằng ngày, để mỗi bản phát hành đủ thời gian quan sát ngay cả khi nhà cung cấp tiếp tục phát hành. Sandbox Docker dùng CLI do image hoặc trình cài sandbox cung cấp. ZCode dùng tệp thực thi do bên triển khai cung cấp.

Không gian làm việc của cuộc trò chuyện trên Dockerfile tùy chỉnh không có Node.js, npm hoặc Python 3 sẽ dùng bản sao của nền tảng. Khi sử dụng lần đầu, nền tảng sao chép Node.js, npm và Python có thể di chuyển vào `$LOOPFORGE_DATA_DIR/cli/toolchain/<build>/`, đồng thời sao chép từng CLI đi kèm (CodeBuddy, Codex, DeepSeek Harness) khi sandbox cần lần đầu, rồi mount thư mục chỉ đọc ở cuối `PATH` của sandbox. Công cụ sẵn có trong image được ưu tiên. Chỉ image glibc đúng kiến trúc của nền tảng dùng được; image Alpine (musl) cần Node.js, npm và Python 3 riêng. Build nền tảng mới tạo thư mục mới và giữ các thư mục trước: sau nâng cấp, xóa các thư mục `cli/toolchain/<build>/` khác (khoảng 200 MB mỗi thư mục cộng CLI đã sao chép).

Dừng dịch vụ foreground bằng Ctrl-C. Khởi động lại bằng cùng lệnh. Dữ liệu MySQL vẫn trong volume Compose. `docker compose stop mysql` dừng cơ sở dữ liệu mà không xóa.

Dùng `AGENTFLOW_MYSQL_DSN` cho triển khai MySQL riêng. Lệnh tài khoản mới hoặc kết nối máy chủ tạo đối tượng schema còn thiếu. Áp dụng từng migration dữ liệu cho bản cài hiện có sau khi xem xét điều kiện tiên quyết; không chạy mù quáng mọi migration lịch sử trên cơ sở dữ liệu mới.

## Chọn trình thực thi

- Bộ chọn mô hình cho làm rõ yêu cầu, phản hồi Bot, báo cáo thông báo SOP, đánh giá lượt chạy và tác vụ AI theo lịch chấp nhận mô hình từ các CLI được hỗ trợ. Client API có thể gửi `codex:<model>`, `claude-code:<model>` hoặc ID mô hình có tiền tố CLI khác. ID mô hình cũ không tiền tố vẫn là ID CodeBuddy. Khi bỏ qua mô hình hoặc dùng `default` không tiền tố, dùng mặc định cá nhân của tài khoản thực thi nếu có. Mặc định CodeBuddy hiện có được ưu tiên trong thứ tự dự phòng. Mô hình cụ thể được truyền nguyên trạng vào CLI.
- Trong **Personal configuration** (Cấu hình cá nhân), thêm thông tin xác thực Git cho mỗi host kho mã và thông tin xác thực trình thực thi cho mỗi CLI sử dụng. Git chọn thông tin xác thực theo giao thức, host và cổng kho mã. Trình thực thi đầu tiên được cấu hình trở thành mặc định cá nhân. Có thể đổi và chọn mô hình mặc định, mức suy luận và chế độ phê duyệt trò chuyện. CodeBuddy chấp nhận Base URL tùy chọn bên cạnh môi trường mạng. Để trống URL để dùng endpoint chính thức của môi trường. CodeBuddy URL tùy chỉnh trên máy thực thi từ xa cần Runner 0.11.2 trở lên.
- Làm rõ dùng thông tin xác thực của người phụ trách, dự phòng về chủ dự án khi chưa phân công. Bot dùng người gửi đã liên kết, báo cáo dùng tài khoản chịu trách nhiệm lượt chạy, đánh giá dùng tài khoản yêu cầu. Phê duyệt có hỗ trợ dùng CLI và mô hình đã chọn của lượt trò chuyện.
- Vai trò SOP và bản xem trước tĩnh có thể chọn CLI riêng. CodeBuddy vẫn là mặc định cho vai trò mới và bản xem trước tĩnh. Để dùng mẫu tích hợp với CLI khác, sao chép vào dự án rồi cập nhật vai trò hoặc sửa mẫu với tư cách quản trị viên nền tảng.
- Đặt `AGENTFLOW_BASELINE_ALIGN_EXECUTOR=codex` trên nền tảng để chạy bộ giải quyết xung đột baseline theo lịch bằng Codex. Cài đặt nhận ID trình thực thi tích hợp, gồm `claude` cho Claude Code. Nếu để trống, bộ giải mặc định dùng CodeBuddy. Lượt chạy mới ghi trình thực thi đã cấu hình vào snapshot.
- Để bỏ CodeBuddy khỏi build nguồn, truyền `--build-arg CODEBUDDY_PACKAGE=` cho Docker hoặc thêm tiền tố `CODEBUDDY_PACKAGE=` khi build Compose phát triển. Dùng image đó làm `AGENTFLOW_ISOLATED_IMAGE` cho sandbox nền tảng. Khi không có image dùng chung, đặt `AGENTFLOW_SKIP_CODEBUDDY_INSTALL=1` cho Dockerfile dự phòng tích hợp. Dockerfile tùy chỉnh tự quản lý gói. Với cờ này danh sách CLI quản lý mặc định cũng bỏ CodeBuddy. Đặt `AGENTFLOW_MANAGED_CLIS` để quản lý danh sách nhà cung cấp rõ ràng.
- Xác thực MCP tracker dùng header danh mục tường minh hoặc `AGENTFLOW_MCP_TOKEN` của triển khai. Tracker phạm vi dự án dùng header xác thực MCP riêng.
- Đặt `AGENTFLOW_GONGFENG_HOST` thành host Git được quản lý (hostname và cổng HTTPS tùy chọn) để bật liên kết kho mã, merge request và kiểm tra token. OAuth Gongfeng cũng cần thông tin xác thực ứng dụng và callback. Ghi đè endpoint OAuth hiện có vẫn ưu tiên.
- Đặt `AGENTFLOW_TAPD_HOST` thành host web TAPD riêng của triển khai khi cần. Liên kết mục công việc TAPD sinh ra mặc định dùng `www.tapd.cn`.

## Cài đặt container

```bash
./start.sh                        # install or start in the background (same as bash scripts/install.sh)
./start.sh logs                   # follow platform logs
./start.sh stop                   # stop; ./start.sh down removes containers but keeps data volumes
./start.sh restart                # restart the platform container
./start.sh pull                   # refresh images; times ghcr.io against ghcr.nju.edu.cn
MIRROR=ghcr.io ./start.sh         # install from ghcr.io without the speed test
MIRROR=ghcr.nju.edu.cn ./start.sh # force that host instead of the speed test
./start.sh dev                    # build this checkout instead (compose.dev.yaml)
./start.sh release                # switch a source build back to the published image
```

Trình cài kiểm tra Docker, Compose, Python 3 và curl. Nó đề nghị cài gói Python/curl còn thiếu qua apt, dnf hoặc yum trên Linux (Homebrew trên macOS), Docker qua trình cài chính thức và plugin Compose Linux x86_64/arm64 còn thiếu bằng bản phát hành chính thức đã ghim, có xác minh SHA-256. Plugin được cài cho người dùng Docker hiện tại hoặc toàn hệ thống khi Docker cần sudo. Compose macOS đến từ Docker Desktop. Đặt `LOOPFORGE_YES=1` để chấp nhận lời nhắc cài; vẫn cần Internet và quyền quản lý gói/quản trị. Trình cài sinh `.env` với bí mật riêng, tải và khởi động container, cài cột quan sát và áp dụng `migrations/seed/*.sql`. Có thể chạy lại an toàn. Đặt `AGENTFLOW_HTTP_PORT` hoặc `LOOPFORGE_MYSQL_PORT` trong môi trường trước lần chạy đầu (hoặc sửa `.env` sau đó) nếu cổng mặc định đã dùng.

Chạy với tư cách chủ bản cài, kể cả người dùng Linux thông thường. Nếu người dùng không truy cập Docker trực tiếp được, trình cài kiểm tra sudo và dùng `sudo -n docker` nhất quán cho Compose, cài schema và seed. Trước mỗi thao tác, nó kiểm tra sudo đã hết hạn trong build dài hay chưa, nhắc lại trong terminal hoặc báo lỗi kèm hướng dẫn ở chế độ không tương tác. Không yêu cầu thêm người dùng vào nhóm Docker hoặc đăng xuất. Với cài không tương tác, chạy `sudo -v` trước; `LOOPFORGE_YES=1` chấp nhận lời nhắc cài nhưng không vượt quyền hệ điều hành. Không có sudo hoặc quyền Docker thì thất bại ngay kèm hướng dẫn. Rootless Docker dùng Unix socket của context hiện hành; context Docker từ xa cần triển khai cấu hình riêng vì workspace sandbox là bind mount cục bộ.

`compose.yaml` là stack image đã phát hành và không build: `./start.sh`, `scripts/install.sh` và `docker compose --profile platform up` thông thường đều tải bản GHCR đã ghim tại đó (hiện là `ghcr.io/tencent/loopforge:0.4.0`). Phiên bản ghim khớp migration và seed của bản checkout, nên checkout tag phát hành khi cài. Chỉ đặt `LOOPFORGE_IMAGE` (ví dụ digest `@sha256:`) để ghi đè; giá trị lưu trong `.env` ưu tiên hơn thay đổi ghim sau này.

Để nâng cấp, cập nhật checkout trước rồi làm mới container:

```bash
git fetch --tags && git checkout vX.Y.Z
./start.sh pull
```

`compose.yaml` mới mang phiên bản image và cài đặt nền tảng mới cùng nhau; `./start.sh pull` tạo lại container nền tảng khi một trong hai thay đổi. Build nguồn từ `./start.sh dev` không được build lại bằng `./start.sh pull`; chạy lại `./start.sh dev` sau cập nhật checkout. Chạy riêng `./start.sh pull` giữ phiên bản đã ghim. Nếu `LOOPFORGE_IMAGE` được lưu trong `.env`, đổi nó thành bản phát hành đã checkout; image mới với `compose.yaml` cũ có thể thiếu cài đặt cần cho bản đó.

Khi tải `ghcr.io` bị đình trệ, `./start.sh` và `./start.sh pull` đo thời gian `ghcr.io` so với [ghcr.nju.edu.cn](https://doc.nju.edu.cn/books/e1654/page/ghcr). Chỉ dùng Nam Kinh khi digest manifest khớp digest vừa đọc từ ghcr.io; tải digest đó rồi gắn tag theo tên trong `compose.yaml`, đồng nghĩa tin cậy host này. Thiếu digest chính thức, không khớp hoặc tải mirror thất bại thì vẫn dùng `ghcr.io`. `MIRROR=ghcr.io` buộc dùng registry gốc; bất kỳ host `MIRROR` khác buộc dùng registry đó, bỏ kiểm tra tốc độ và không dự phòng. Lựa chọn không ghi vào `.env`. Chính sách pull vẫn là `missing` lúc cài, nên giữ image cục bộ và không đo lại; `./start.sh pull` đo registry và làm mới từ bên nhanh hơn. GitHub Release ghi digest image; `docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/tencent/loopforge:<pin>` phải hiển thị cùng digest sau `@`. Cài đặt `registry-mirrors` của Docker, gồm `https://docker.nju.edu.cn`, chỉ áp dụng Docker Hub và không thể dùng làm `MIRROR`. Giá trị `LOOPFORGE_IMAGE` không phải dạng ghcr.io name:tag được giữ nguyên.

```bash
./start.sh
MIRROR=ghcr.io ./start.sh pull
MIRROR=ghcr.nju.edu.cn ./start.sh pull
```

`./start.sh dev` (hoặc `LOOPFORGE_BUILD_FROM_SOURCE=1 bash scripts/install.sh`) build checkout này thành `loopforge-platform:local` từ `compose.dev.yaml`. Nó lưu `COMPOSE_FILE=compose.yaml:compose.dev.yaml` trong `.env`, nên lần chạy sau và lệnh `docker compose` thông thường tiếp tục dùng build nguồn đến khi chạy `./start.sh release`. Build nguồn dùng lại bộ nhớ đệm npm, Go module và trình biên dịch Go.

Push tag `vX.Y.Z` trên `main` chạy workflow `release` khi workflow `platform` đã đạt trên commit đó. `compose.yaml` được gắn tag phải ghim `loopforge:X.Y.Z` từ trước. Nó phát hành `ghcr.io/<owner>/loopforge` dưới các tag `X.Y.Z`, `X.Y`, `latest` và `sha-<commit>`, kiểm tra smoke digest đã push bằng `./start.sh` và tạo GitHub Release. Fork phát hành dưới owner riêng; thiết lập hiển thị/quyền truy cập gói GHCR cho nhóm trước khi phân phối image. Mặc định chỉ pull khi thiếu; dùng tag/digest bất biến, hoặc đặt `LOOPFORGE_PULL_POLICY=always` khi cập nhật tag có thể thay đổi. Giá trị `.env` hiện có ưu tiên; sửa image hoặc URL đã lưu khi nâng cấp bản cài. Compose chờ kiểm tra sức khỏe API với timeout hữu hạn trước khi cài phần mở rộng schema và seed.

Mở nền tảng và tạo tài khoản đầu tiên trong trình duyệt; tài khoản đó nhận quyền quản trị nền tảng. Đến khi tài khoản tồn tại, trang đăng nhập chỉ cung cấp bước thiết lập này.

Trong thiết lập đầu tiên, giới hạn security group hoặc firewall đám mây ở IP của người vận hành. Không công khai trang tạo tài khoản đầu tiên cho client Internet bất kỳ trước khi tạo tài khoản quản trị viên.

Nền tảng lắng nghe trên `LOOPFORGE_BIND`, mặc định `0.0.0.0`, không nhắc nhập URL truy cập. Trình cài in địa chỉ công khai, LAN và cục bộ; trên Tencent Cloud, Alibaba Cloud, AWS, GCP và Azure nó đọc IP công khai từ dịch vụ metadata link-local của nhà cung cấp; ở nơi khác sau NAT, bạn tự mở IP công khai. `LOOPFORGE_PUBLIC_URL` tùy chọn và chỉ đổi địa chỉ được in. Cho phép cổng HTTP trong security group/firewall đám mây hoặc dùng reverse proxy HTTPS. Tệp `.env` hiện có được giữ; bản cài cũ không có cài đặt bind giờ cũng lắng nghe trên `0.0.0.0`. Bản cài chỉ cục bộ có thể đặt `LOOPFORGE_BIND=127.0.0.1`. Proxy yêu cầu WebSocket và streaming. Đặt `AGENTFLOW_SECURE_COOKIES=true` khi HTTPS kết thúc tại proxy. Giữ `AGENTFLOW_SESSION_SECRET` ổn định giữa các instance API và lần khởi động lại.

Cổng xác thực doanh nghiệp có thể đăng nhập người dùng qua header với `AGENTFLOW_TRUST_IDENTITY_HEADERS=true`. Tùy chọn mặc định tắt. API khi đó chỉ chấp nhận `Staffname` / `x-staff-name` từ peer loopback và chỉ khi nhận biết yêu cầu đến từ gateway:

- Đặt `AGENTFLOW_IDENTITY_HEADER_SECRET` thành giá trị ngẫu nhiên, yêu cầu gateway gửi trong `X-AgentFlow-Gateway-Secret`. Gateway phải ghi đè, không bao giờ chuyển tiếp nguyên trạng header `Staffname`, `Staffid`, `x-staff-name` và `X-AgentFlow-Gateway-Secret` của client.
- Nếu không có bí mật, mọi yêu cầu mang `X-Forwarded-For`, `Forwarded` hoặc `X-Real-IP` được coi là client chuyển tiếp, header định danh bị bỏ qua. Điều này chỉ bảo vệ proxy thêm ít nhất một header đó: proxy cùng máy chuyển tiếp header client mà không thêm (ví dụ nginx `proxy_pass` không có `proxy_set_header X-Forwarded-For`), và tiến trình khác trên máy, vẫn có thể đăng nhập dưới danh nghĩa bất kỳ người dùng nào. Đặt bí mật bất cứ khi nào bật đăng nhập header; nền tảng ghi cảnh báo khi khởi động nếu thiếu.

### Sandbox Docker

Nền tảng cung cấp sandbox mặc định tích hợp (`local`) ngay cả khi chưa cài SQL danh mục. Đây là dự phòng trong bộ nhớ và không chèn hàng cơ sở dữ liệu. Profile `local` đã lưu được ưu tiên, gồm driver và môi trường đã cấu hình. Không thể xóa mặc định; sửa cấu hình hoặc tạo profile khác để thay đổi cách tác vụ chạy. Trình cài đầy đủ vẫn nhập SOP khởi đầu và dự án chào mừng.

Với dịch vụ trực tiếp chạy bằng người dùng host thông thường, image Docker mặc định/root chạy với UID/GID của người dùng dịch vụ để workspace riêng vẫn truy cập được mà không nới quyền hoặc thêm capability. Image chọn rõ người dùng không root giữ nguyên định danh đó; người vận hành phải bố trí ownership bind mount tương thích.

Triển khai Compose mount Docker socket của host vào container nền tảng để SOP AI tích hợp chạy ngay. `AGENTFLOW_ISOLATED_IMAGE` trỏ đến image nền tảng đã cài: sandbox mặc định khởi động container cùng cấp riêng từ chính image đó, không tải CLI hoặc build image lần hai. Chúng không mount Docker socket. Dockerfile tùy chỉnh vẫn build và cache image riêng. Workspace lượt chạy mount tại `/workspace` trên mạng Compose. Vì bind mount được daemon Docker của host phân giải, `LOOPFORGE_DATA_DIR` (được `scripts/configure.sh` ghi vào `.env`, mặc định `./.data`) mount vào container nền tảng tại cùng đường dẫn tuyệt đối; workspace và trạng thái CLI nằm bên dưới. Workspace cuộc trò chuyện trực tiếp bind mount thư mục gốc cuộc trò chuyện theo cách tương tự, nên `compose.yaml` đặt `AGENTFLOW_CONVERSATION_DIR` thành `${LOOPFORGE_DATA_DIR}/conversations`. Workspace cuộc trò chuyện trong triển khai Compose dùng sandbox Docker: sandbox trực tiếp (bwrap) cần namespace user và PID mà container nền tảng không đặc quyền không thể tạo; image không có bubblewrap. Dùng cài trực tiếp hoặc máy thực thi đã kết nối cho sandbox trực tiếp. Tệp đính kèm và trạng thái trợ lý riêng từng người dùng nằm ở `AGENTFLOW_ASSISTANT_SESSION_DIR` (`/data/assistant` trong volume `platform-data`), không bao giờ mount vào workspace. Container nền tảng không đặt `AGENTFLOW_CONVERSATION_DIR` cũng giữ thư mục cuộc trò chuyện tại đó; mở workspace khi ấy thất bại với `mkdirat ... read-only file system`.

Nút SOP Docker dùng trình thực thi CLI chuẩn trước hết tìm CLI trên PATH người dùng sandbox. Nếu thiếu, LoopForge dùng bản cài dùng chung cho image nền tảng nếu có hoặc chạy cùng trình cài như workspace cuộc trò chuyện trong container. Cài đặt dùng proxy đã cấu hình của sandbox; các nút sau trong container dùng lại CLI. Cài trong container cần hệ thống tệp ghi được và quyền truy cập nguồn gói chính thức. Sandbox chỉ đọc có thể dùng CLI từ image hoặc toolchain đã mount. ZCode dùng tệp thực thi chính thức do image cung cấp.

Quyền Docker socket tương đương root trên host. Hai biện pháp phòng hộ xuất phát từ đó: nền tảng chạy mọi tác vụ trong container sandbox, kể cả SOP cấu hình driver `local` (`AGENTFLOW_LOCAL_SANDBOX=docker`), và chỉ quản trị viên nền tảng có thể trỏ kho mã đến đường dẫn nguồn host. Dù vậy, người có thể chạy SOP có thể thực thi mã trong container trên host này, nên chỉ cấp tài khoản cho người đáng tin cậy và không phơi dịch vụ ra mạng không đáng tin. CLI tác tử cũng áp dụng cấu hình của kho mã đã liên kết theo quy tắc gốc của chúng, kể cả lượt chạy SOP không giám sát: chỉ dẫn `AGENTS.md`/`CLAUDE.md`, `.codebuddy/`, `.claude/settings.json` (hook và môi trường) và `.mcp.json` có thể khởi động lệnh hoặc máy chủ MCP trong sandbox. Chỉ liên kết kho mã có nội dung đáng tin. Để chạy không có socket, bỏ volume `docker.sock` và cài đặt `AGENTFLOW_LOCAL_SANDBOX` khỏi `compose.yaml`, rồi kết nối worker hoặc máy thực thi có Docker riêng cho SOP AI; SOP chào mừng chỉ có script khi đó chạy trong container nền tảng.

### Mạng chậm: giới hạn clone và build image

Clone kho mã và build image sandbox tùy chỉnh báo tiến độ trong khi chạy; lỗi giữ các dòng cuối đầu ra Git hoặc Docker. Cuộc trò chuyện hiển thị bước build Docker hiện tại trên nền tảng và runner đã kết nối. Một bước Dockerfile dài không có đầu ra có thể tiếp tục đến khi bên gọi hoặc giới hạn cấu hình dừng build. Mọi cài đặt nhận duration Go như `90s` hoặc `20m`. `0` tắt giới hạn. Đặt biến trên tiến trình nền tảng hoặc máy thực thi chạy lệnh.

Chuẩn bị workspace cuộc trò chuyện của Runner tuân theo vòng đời yêu cầu cuộc trò chuyện. Dừng lượt hoặc mất kết nối điều khiển runner hủy chuẩn bị.

| Cài đặt | Mặc định | Áp dụng cho |
|---|---|---|
| `AGENTFLOW_GIT_CLONE_STALL_TIMEOUT` | `5m` | `git clone` không có đầu ra. Không áp dụng khi nền tảng clone từ đường dẫn nguồn cục bộ của kho mã, có bước repack cuối im lặng. |
| `AGENTFLOW_GIT_CLONE_TIMEOUT` | tắt trên nền tảng, `10m` trên máy thực thi | Toàn bộ `git clone`. Máy thực thi giữ giới hạn cố định 10 phút trước đây làm mặc định. |
| `AGENTFLOW_DOCKER_BUILD_STALL_TIMEOUT` | tắt | Giới hạn không đầu ra tùy chọn cho `docker build`. Bước `RUN` im lặng tính là không có đầu ra. |
| `AGENTFLOW_DOCKER_BUILD_TIMEOUT` | tắt | Toàn bộ `docker build`. |

Clone bị dừng theo cách này không được thử lại vì sẽ chờ cùng mạng. Khi host thực thi truy cập GitHub hoặc mirror Debian chậm, trỏ git đến proxy (`git config --global http.proxy`) và dùng mirror gói gần hơn trong Dockerfile thay vì tăng giới hạn.

### Kho Git qua SSH

Dùng Git SSH cho GitLab.com, GitLab tự quản, Gitea, Gogs, GitHub và host Git khác cung cấp giao thức này. Trong **Project settings → Code repositories** (Cài đặt dự án → Kho mã) hoặc **Quick access** (Kết nối nhanh), nhập địa chỉ clone như `git@gitlab.com:group/repo.git` hoặc `ssh://git@git.example.org:2222/group/repo.git` và chọn nhánh mặc định hiện có. GitHub HTTPS tiếp tục dùng cấp quyền GitHub hoặc PAT.

1. GitHub (`github.com:22` và `ssh.github.com:443`) dùng khóa host tích hợp. Với host khác, quản trị viên nền tảng mở **Platform administration → Git SSH Host Trust** (Quản trị nền tảng → Tin cậy host Git SSH), nhập hostname và cổng tùy chọn, chọn **Read key and review fingerprint** (Đọc khóa và kiểm tra fingerprint). Nền tảng đọc khóa công khai qua bắt tay SSH, chịu ràng buộc `AGENTFLOW_GIT_EGRESS_ALLOW_CIDRS`. Với host riêng, chọn Runner cá nhân trực tuyến có quyền truy cập máy chủ và hỗ trợ khám phá khóa host. Có thể nhập khóa công khai OpenSSH thủ công, gồm nhiều khóa cho một host. Kiểm tra fingerprint SHA256 hiển thị với nhà cung cấp Git hoặc quản trị viên máy chủ trước khi xác nhận. Đăng ký áp dụng toàn nền tảng cho đúng host và cổng. Chỉnh sửa và xóa được nhận ở thao tác Git do nền tảng quản lý tiếp theo hoặc phiên CLI hay terminal workspace mới.
2. Runner **0.11.1** trở lên nhận mục nền tảng phù hợp khi tác vụ hoặc yêu cầu workspace cần Git SSH. Triển khai cũng có thể trỏ `AGENTFLOW_GIT_SSH_KNOWN_HOSTS` đến tệp OpenSSH `known_hosts` chuyên dụng. Với Compose, đặt tệp dưới bind mount `LOOPFORGE_DATA_DIR` và đặt đường dẫn tuyệt đối trong `.env`. Mục trong tệp nền tảng và trang quản trị được kết hợp. Dùng hostname hoặc IP chính xác, với `[host]:port` cho cổng không mặc định. Khóa tin cậy từ nền tảng được ưu tiên với cùng host và cổng. Khóa cục bộ Runner áp dụng khi nền tảng chỉ cung cấp mục thu hồi hoặc không có mục cho endpoint. Cả hai nguồn áp dụng mục `@revoked` rõ ràng. Mục mã hóa có giới hạn 1 MiB mỗi lần điều phối. Runner **0.9.3** đến **0.11.0** vẫn cần tệp và biến riêng. Worker riêng có thể đọc registry từ cơ sở dữ liệu dùng chung hoặc dùng tệp triển khai riêng.

   Nếu registry cơ sở dữ liệu không khả dụng, nền tảng ghi lỗi và tiếp tục dùng tệp triển khai và khóa GitHub tích hợp. Khóa cục bộ Runner vẫn khả dụng theo cùng quy tắc ưu tiên. Tệp `known_hosts` đã cấu hình nhưng không đọc được vẫn chặn thao tác Git SSH vì có thể chứa mục thu hồi. Danh sách quản trị đánh dấu mục không hợp lệ để xóa; mục có hostname hợp lệ có thể sửa tại chỗ. Mục không hợp lệ không cung cấp khóa tin cậy.

   Cài Git và OpenSSH client trên máy thực thi và image sandbox tùy chỉnh. Lệnh sandbox Docker cần sandbox và tiến trình thực thi chia sẻ kernel Linux cho socket tác tử ký. Với VM Docker tách khỏi runner trực tiếp, dùng checkout và bàn giao được quản lý hoặc dùng sandbox trực tiếp cho lệnh Git tương tác.
3. Tạo khóa SSH chuyên dụng không có passphrase để thực thi không giám sát. Thêm từng khóa công khai vào tài khoản lưu trữ và cấp quyền kho mã cần dùng. Cấp quyền ghi nếu lượt chạy cần push. Trong **Personal settings → Git SSH keys** (Cài đặt cá nhân → Khóa Git SSH), thêm một khóa riêng cho mỗi host SSH như `gitlab.com` hoặc `git.example.org:2222`. Bỏ cổng nghĩa là 22. Sửa mục của host để thay khóa.

Kho mã tự động dùng khóa người dùng hiện tại theo host và cổng SSH; kho mã cùng host và cổng dùng chung khóa đó. Biểu mẫu kho mã chỉ hiển thị cảnh báo đỏ khi host chưa có khóa cá nhân. Nhắc nhở không chặn lưu kho mã hoặc hoàn tất thiết lập; có thể cấu hình thông tin xác thực và tin cậy host trước thao tác Git đầu tiên. Không có khóa riêng theo kho hay khóa dự phòng mặc định. Checkout và thực thi SOP dùng khóa người chịu trách nhiệm. Gửi kết quả cuộc trò chuyện và terminal workspace dùng khóa người yêu cầu. Tác tử ký tạm thời đóng khi lệnh hoặc terminal kết thúc. Tác tử ký của terminal không bao giờ nằm trong workspace dùng chung: với driver `bwrap` nó nằm trong thư mục riêng chỉ bind vào terminal đó, còn driver `local` (không cô lập) giữ bên ngoài workspace trong thư mục 0700. Workspace Docker và seatbelt dùng chung một góc nhìn hệ thống tệp giữa mọi tiến trình, nên terminal của chúng không nhận khóa SSH cá nhân; push từ đó bằng thao tác gửi của nền tảng. Địa chỉ `git@github.com:` và `ssh://git@github.com/` được lưu dưới dạng kho GitHub (HTTPS + token, pull request tự động) trừ khi `provider` rõ ràng là `ssh`. Để xoay vòng khóa, thay trong cài đặt và thu hồi khóa công khai cũ tại host.

SSH xử lý clone, fetch và push. Bàn giao qua cuộc trò chuyện trả nhánh và SHA commit. Có thể tùy chọn thêm URL web kho mã để mở host và tạo PR/MR thủ công. Nhập Issue và tự động hóa PR/MR cần thông tin xác thực API host. Để tự động hóa, thêm MCP riêng cho host trong **Settings → Assets → MCP** (Cài đặt → Tài nguyên → MCP), cấp token phạm vi riêng và gắn vào tác tử hoặc quy trình thích hợp. [CNB không hỗ trợ Git SSH](https://docs.cnb.cool/en/guide/git-access.html); nó dùng HTTPS với token truy cập CNB, ngoài phạm vi tích hợp này.

## Tài khoản

Tài khoản đầu tiên tạo trong trình duyệt trở thành quản trị viên nền tảng. Sau đó, ai truy cập được trang đăng nhập đều có thể đăng ký người dùng thông thường khi `AGENTFLOW_ALLOW_SIGNUP` là `true` (mặc định). Người dùng đã đăng ký có thể tạo yêu cầu và chạy SOP trên worker của bạn, nên đặt `AGENTFLOW_ALLOW_SIGNUP=false` cho bản cài có thể truy cập từ mạng không đáng tin và tạo tài khoản tường minh.

Quản trị viên nền tảng tạo tài khoản trong **Platform administration → Member accounts** (Quản trị nền tảng → Tài khoản thành viên): nhập tên đăng nhập, mật khẩu ban đầu, tùy chọn cấp quyền quản trị và chuyển mật khẩu cho đồng đội. Cùng trang đó liệt kê mọi tài khoản và đặt lại mật khẩu tài khoản đăng nhập bằng mật khẩu; không thể cấp mật khẩu ở đây cho tài khoản đăng nhập qua GitHub hoặc gateway. Tài khoản mới tham gia dự án chào mừng, giống tự đăng ký.

LoopForge giả định nhóm đáng tin. Mọi tài khoản đã đăng nhập có thể liệt kê mọi dự án, yêu cầu và lượt chạy. Chỉ chủ dự án hoặc quản trị viên nền tảng có thể thay đổi cài đặt dự án và kho mã; chỉ chủ thông tin xác thực cá nhân có thể thay đổi chúng. Không sử dụng một bản cài để phân tách các tenant không đáng tin.

Không dùng trình duyệt, export giá trị `.env` cho bản cài trực tiếp rồi chạy lệnh tài khoản tường minh:

```bash
set -a; source .env; set +a
read -r -s -p 'Password: ' account_password; echo
printf '%s\n' "$account_password" | go run ./cmd/loopforge-account -user alice
unset account_password
```

Chỉ dùng `-admin` khi cấp quyền quản trị nền tảng. Chạy lại lệnh xoay vòng mật khẩu tài khoản đó. Hash mật khẩu dùng bcrypt. Phiên trình duyệt dùng cookie HttpOnly, SameSite có chữ ký và hết hạn sau bảy ngày. Không có cá nhân được chỉ định nào mặc nhiên nhận vai trò quản trị viên; có thể quản lý quản trị viên bổ sung qua UI quản trị nền tảng hiện có.

## Worker và runner

Vai trò tiến trình upstream vẫn là `-role api`, `-role worker` và `-role all`. Instance API và worker phải chia sẻ cơ sở dữ liệu MySQL và cấu hình phù hợp triển khai. Đặt `AGENTFLOW_CONTROL_TOKEN`, `AGENTFLOW_CONTROL_URL` và `AGENTFLOW_WORKER_URL` khi tách điều khiển và thực thi. Đặt `AGENTFLOW_PLATFORM_MCP_URL` thành URL nền tảng thực mà container thực thi truy cập được.

Runner cá nhân kết nối từ trang máy thực thi bằng mã liên kết ngắn hạn. Trình cài phục vụ tại `/runners/install.sh`. `AGENTFLOW_RUNNER_BINARY` có thể trỏ đến tệp nhị phân với phép thay thế `{os}` và `{arch}`. Image container đi kèm binary runner và gate Linux/macOS amd64/arm64. Cài trực tiếp từ mã nguồn có thể build theo nhu cầu bằng Go.

Workspace Docker trên macOS dùng tệp thực thi Linux Runner cho thông tin xác thực Git và lệnh gọi MCP. Trình cài chọn kiến trúc macOS Runner đã cài, kể cả binary Intel chạy dưới Rosetta. Với Runner universal trên Apple Silicon, nó cài helper arm64 và thêm helper amd64 khi có. Khởi động foreground và lệnh do `--no-start` in chọn phần arm64 gốc, kể cả từ shell Rosetta. Trên Mac Intel, trình cài cài helper amd64. Mặc định helper nằm cạnh binary host. Mẫu `AGENTFLOW_RUNNER_BINARY` phía Runner với `{os}` chọn đường dẫn cài và runtime. Để cài cả hai helper, dùng `{arch}` và đặt đích khác nhau cho mỗi kiến trúc. Trình cài lưu mẫu để nâng cấp, đưa vào launchd và lệnh khởi động in bởi `--no-start`. Đường dẫn helper phải trỏ tới tệp tách biệt với macOS Runner.

Trình cài kiểm tra đích helper với binary macOS đã staging và cài helper Gate MCP cần thiết trước khi thay Runner đã cài. Khi Runner hiện có helper Docker hoạt động, nâng cấp cần helper tương thích tại đường dẫn cấu hình Runner mới trước khi thay binary và khởi động lại dịch vụ. Mẫu tương đối trong cấu hình launchd đã cài dùng thư mục làm việc của job. Trình cài và cập nhật xác minh định dạng, kiến trúc và load segment của binary Linux trước khi thay thế. Bản cài tùy chỉnh giữ helper tương thích hiện có. Runner build từ checkout cục bộ có thể build binary đi kèm từ checkout đó. URL tải có placeholder `{os}` có thể cung cấp cả hai binary khi dùng làm nguồn tải Runner.

Khi bật cập nhật nền tảng, Runner macOS đồng bộ helper nền khi khởi động. Kiểm tra phiên bản thất bại được thử lại khi quét lại, kể cả có helper cũ còn dùng được. ELF cục bộ đọc được và tương thích hoặc script wrapper cấu hình cục bộ có thể sao chép vào workspace Docker với quyền thực thi trong lúc đồng bộ. Thao tác cần helper còn thiếu cho Git hoặc MCP có thể chờ tối đa năm giây cho đồng bộ ban đầu. Tải nền tiếp tục trong timeout truyền riêng.

Quản trị viên nền tảng có thể chia sẻ một CodeBuddy API Key trong **Platform administration → Shared CodeBuddy Key** (Quản trị nền tảng → CodeBuddy Key dùng chung): chọn môi trường mạng cấp key và mô hình thành viên được dùng (mục đầu là mặc định). Thành viên không có key riêng có thể trò chuyện và chạy SOP bằng key đó, giới hạn ở các mô hình đã chọn; vai trò cấu hình mô hình khác chạy mặc định và lượt chạy thông báo điều đó. Thành viên có key riêng tiếp tục dùng với bất kỳ mô hình nào. Làm rõ, báo cáo, Bot và đánh giá lượt chạy dùng thông tin xác thực cá nhân của tài khoản liên quan. Prompt theo lịch tuân cài đặt xác thực và tài trợ của CLI đã chọn. Key lưu trong cơ sở dữ liệu như key cá nhân và không hiển thị lại sau lưu. `AGENTFLOW_ASSISTANT_SPONSOR_LOGIN`, vốn cho mượn key tài khoản với giới hạn `deepseek-v4.1-flash`, vẫn áp dụng khi chưa cấu hình key chung.

Cấu hình thông tin xác thực nhà cung cấp trong UI nền tảng, không phải cấu hình CLI toàn cục của host. Thông tin xác thực được runtime upstream gắn với chủ thể chịu trách nhiệm. Ô soạn thảo trang chủ và vai trò SOP chọn CLI tích hợp độc lập. Chọn trình thực thi cạnh bộ chọn mô hình trang chủ; API key (và Base URL Codex/Claude tùy chọn) lấy từ cài đặt cá nhân. Thay trình thực thi giữ bản nháp; cuộc trò chuyện đã lưu ghi trình thực thi sử dụng. Thao tác ghi Main Bot vẫn đi qua gateway công cụ nền tảng và kiểm tra phê duyệt. Tác vụ trợ lý theo lịch chọn bất kỳ CLI hỗ trợ nào và chạy như lượt trò chuyện thông thường; Codex và Claude Code vẫn cần thông tin xác thực riêng của tài khoản đó. Kiểm thử mô hình trực tiếp là opt-in; đặt `AGENTFLOW_LIVE_TESTS=1` chỉ cho bộ nghiệm thu cần tải thông tin xác thực cục bộ.

## Schema quan sát

Sau khi tạo bảng cơ sở, chạy `bash scripts/install-schema-extensions.sh` cho cơ sở dữ liệu Compose. Nó cài cột `run_telemetry.adapter` và `run_logs.level` còn thiếu cùng chỉ mục từ migration upstream `001_run_obs_generated_columns.sql`, rồi chạy lại danh mục khởi đầu `INSERT IGNORE` và các bản viết lại danh mục tích hợp từ `031_generic_backend_openssh.sql`, `033_generic_sop_mr_node.sql`, `038_generic_sop_host_credentials.sql` theo thứ tự đó. Viết lại có thể lặp lại và chỉ áp dụng mặc định khớp. Trình cài chạy trước khi in địa chỉ; `./start.sh pull` chạy lại sau khi tạo lại container, nên volume dữ liệu cũ được nâng cấp lên image mới nhận cột mà mã mới đọc và đồ thị SOP tích hợp mà mã mới cung cấp. Khởi động ứng dụng không chạy migration dữ liệu.

Với MySQL bên ngoài, xem migration và kiểm tra cột tồn tại trước khi áp dụng câu lệnh tương ứng. Cột sinh tự động lưu trữ có thể rebuild bảng lớn hiện có; lên lịch thao tác phù hợp.

### Migration cần khi nâng cấp

`migrations/` giữ ba loại tập lệnh. Kiểm tra ghi chú phát hành để biết tệp một phiên bản bổ sung, rồi đọc header của tập lệnh trước khi chạy.

| Loại | Ví dụ | Người vận hành cần làm |
| --- | --- | --- |
| Đã áp dụng bởi trình cài và `./start.sh pull` | `001_run_obs_generated_columns.sql`, `migrations/seed/*.sql`, `031_generic_backend_openssh.sql`, `033_generic_sop_mr_node.sql`, `038_generic_sop_host_credentials.sql` | Không cần gì; tập lệnh trên đã xử lý |
| Migration nâng cấp bắt buộc | `009_bot_interactions_utf8mb4.sql`, `036_git_http_credentials.sql` | Tuân thời điểm và điều kiện tiên quyết mỗi migration. [Di chuyển thông tin xác thực GitHub hiện có](#di-chuyển-thông-tin-xác-thực-github-hiện-có) |
| Bổ sung dữ liệu và viết lại hàng hiện có tùy chọn | `016_public_optional_repositories.sql`, `021_assistant_session_sources.sql` | Chạy nếu bản cài cần các hàng đã chuyển đổi |

## Cập nhật SOP công khai hiện có

Liên kết kho mã là tùy chọn cho mọi SOP chung tích hợp. Để cập nhật chỉ dẫn danh mục gốc trên bản cài hiện có, áp dụng tường minh:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u loopforge loopforge' < migrations/016_public_optional_repositories.sql
```

SQL có thể lặp lại này chỉ đổi trường chỉ dẫn còn khớp seed công khai gốc. Nó giữ chỉnh sửa người vận hành và bản sao dự án. Bản cài mới đã nhận chỉ dẫn từ seed danh mục công khai; khởi động ứng dụng không di chuyển dữ liệu.

Trên cài Compose, trình cài và `./start.sh pull` thêm nút 「发起 MR」 (Tạo MR) vào SOP backend, frontend và sửa lỗi tích hợp. Chúng áp dụng `033_generic_sop_mr_node.sql` để thêm bước rồi `038_generic_sop_host_credentials.sql` để cập nhật chỉ dẫn vai trò MR ban đầu. Để áp dụng SQL thủ công, chạy cả hai migration cùng thứ tự.

```bash
cat migrations/033_generic_sop_mr_node.sql migrations/038_generic_sop_host_credentials.sql \
  | docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u loopforge loopforge'
```

Migration 033 kiểm tra đồ thị nút và vị trí 交付汇总 (Tổng hợp bàn giao) vẫn khớp mẫu phát hành. Nó chỉ cập nhật prompt 交付汇总 khi chưa chỉnh sửa. Migration 038 thay chỉ dẫn xác thực Git gốc bằng hướng dẫn dùng CLI host, MCP đã cấu hình hoặc `git credential fill` để truy cập API. Cả hai migration giữ bản sao dự án và có thể lặp lại. Thông tin xác thực Git của người chịu trách nhiệm lượt chạy phải có quyền push để bước mới hoàn tất.

## Thông tin xác thực GitHub

Người dùng có thể chọn **Connect GitHub** (Kết nối GitHub) trong thông tin xác thực cá nhân hoặc khi thêm kho mã, sao chép PIN hiển thị và phê duyệt trên GitHub. Nền tảng lưu quyền được cấp vào vị trí thông tin xác thực Git hiện có của người dùng đã đăng nhập. Bộ chọn kho mã liệt kê kho thuộc tài khoản, được chia sẻ hoặc truy cập qua tổ chức, hỗ trợ phân trang và tìm trong kho đã tải, sao chép nhánh mặc định thực của kho được chọn vào biểu mẫu. Vẫn hỗ trợ nhập PAT.

Bản cài mới dùng OAuth App LoopForge tích hợp. Người dùng không tạo ứng dụng, cấu hình Client ID hoặc xin PAT: chọn **Connect GitHub**, sao chép PIN và phê duyệt ứng dụng LoopForge trên GitHub. Không thể bỏ qua xác nhận GitHub; cấp quyền thiết bị không phải đăng nhập không tương tác.

Cấu hình ứng dụng thuộc triển khai và không hiển thị trong thông tin xác thực cá nhân. Người vận hành cần ứng dụng riêng có thể đăng ký OAuth App, bật **Device Flow**, giữ tắt hết hạn token đến khi hỗ trợ refresh, và đặt Client ID công khai bằng `AGENTFLOW_GITHUB_CLIENT_ID` trong `.env`. Không cần client secret. Môi trường triển khai ghi đè ứng dụng tích hợp và mọi ghi đè trong cơ sở dữ liệu. Endpoint chỉ quản trị viên `PUT /api/auth/github/config` vẫn dùng được cho ghi đè cơ sở dữ liệu tường minh; Client ID rỗng tắt cấp quyền thiết bị rõ ràng thay vì âm thầm khôi phục mặc định. Cấu hình tường minh hiện có được giữ.

Luồng yêu cầu OAuth scope `repo` để clone riêng tư, push, Issue và PR hoạt động. Scope OAuth GitHub bao phủ các kho truy cập được; chọn kho mã trong LoopForge liên kết nó với dự án và không thu hẹp quyền đã cấp OAuth. SSO tổ chức hoặc hạn chế ứng dụng bên thứ ba có thể cần tổ chức phê duyệt. Xem [tài liệu cấp quyền thiết bị của GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow). Quyền chờ cấp hết hạn và chỉ giữ trong bộ nhớ API: dùng session affinity cho `/api/auth/github/*` khi có nhiều instance API, rồi khởi động lại cấp quyền sau khi API khởi động lại. Token và mã thiết bị GitHub không bao giờ gửi tới trình duyệt.

Nhập GitHub Issue và đồng bộ trạng thái PR dùng Git token của chủ dự án. Thao tác Git và tích hợp MCP GitHub tùy chọn dùng token người chịu trách nhiệm. Đọc công khai có thể hoạt động không token; kho riêng tư và thao tác ghi cần quyền kho. MCP GitHub phải cài tường minh và chỉ gửi thông tin xác thực đến endpoint HTTPS chính thức.

Commit Git do nền tảng tạo dùng tên tài khoản cục bộ chịu trách nhiệm và email không thể gửi `@users.noreply.loopforge.invalid`. Tài khoản cục bộ không xác lập email công ty hoặc định danh GitHub đã xác minh.

### Di chuyển thông tin xác thực GitHub hiện có

Khi nâng từ v0.4.0 lên phiên bản đọc thông tin xác thực HTTPS theo host, dừng API và worker cũ, giữ MySQL chạy. Áp dụng `036_git_http_credentials.sql` của bản đích thủ công trước khi khởi động nền tảng nâng cấp hoặc chạy `./start.sh pull`. Với Compose dùng:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u loopforge loopforge' < migrations/036_git_http_credentials.sql
```

Bổ sung dữ liệu sao chép PAT GitHub và quyền device-flow hiện có vào mục `github.com`. Nếu bản cài đã nâng cấp và token người dùng còn ở cột cũ, áp dụng bổ sung khôi phục mục còn thiếu. Mục `github.com` hiện có ưu tiên.

Kiểm tra thông tin xác thực sau nâng cấp. Sau cửa sổ rollback, chạy `037_retire_plain_git_token.sql` thủ công cùng lệnh với tên tệp dọn dẹp. Nó chỉ xóa token cũ khi mục `github.com` tương ứng có cùng giá trị. Nếu khác nhau, giữ cả hai.

## Môi trường xác thực CodeBuddy

Trong cài đặt cá nhân, chọn môi trường mạng thuộc API key; liên kết lấy API key mở trang key của edition đó. Key từ edition này trả HTTP 401 khi gửi đến edition khác; key nhà cung cấp mô hình bên thứ ba (DeepSeek, OpenAI và tương tự) không phải key CodeBuddy. Cài đặt theo từng người dùng; bản cài công khai không mặc định môi trường doanh nghiệp.

| Edition | Giá trị lưu | Trang key |
| --- | --- | --- |
| Quốc tế | rỗng | https://www.codebuddy.ai/profile/keys |
| Trung Quốc | `internal` | https://copilot.tencent.com/profile/ |
| iOA | `ioa` | https://tencent.sso.copilot.tencent.com/profile/keys |

`PUT /api/users/:id/credentials` chỉ nhận các giá trị này (`public` và `China` cũng được hiểu) và từ chối giá trị khác với HTTP 400, vì CLI âm thầm dự phòng về edition quốc tế đối với giá trị không nhận biết.

Cấu hình chuyên dụng/tự lưu trữ khác được mô tả trong [tài liệu định danh CodeBuddy chính thức](https://www.codebuddy.ai/docs/cli/iam). Cấu hình danh mục mô hình bằng `AGENTFLOW_ASSISTANT_MODEL` và `AGENTFLOW_ASSISTANT_MODELS`; vai trò thông thường có thể chọn mô hình độc lập.

## Nghiệm thu container cô lập

Chạy `python3 scripts/test-install.py -v` cho kiểm thử hồi quy trình cài, bao phủ chọn sudo, truy cập Docker trực tiếp, lỗi quyền không tương tác, cài lặp lại, chế độ image và URL truy cập. Với image nền tảng build cục bộ, `LOOPFORGE_INSTALL_TEST_IMAGE=your-image bash scripts/test-install-live.sh` kiểm chứng cài root và UID 65534 thực, truy cập HTTP không loopback, tạo tài khoản đầu tiên và cài lặp lại trong dự án Compose cô lập với cổng ngẫu nhiên. Kiểm thử trực tiếp cần runner kiểm thử Linux root để hạ quyền; nó tự xóa container và volume sau đó. Để kiểm thử sudo thực trong container cài đặt dùng một lần UID 1000, build `scripts/testdata/install-sudo.Dockerfile` với `--build-arg LOOPFORGE_TEST_BASE=your-image`, rồi truyền image kiểm thử đó dưới `LOOPFORGE_INSTALL_SUDO_TEST_IMAGE`. Trình cài production tự nó không yêu cầu root.

Từ thư mục gốc kho mã, chạy `bash scripts/test-container.sh` sau khi cài dependency `e2e/` và Chromium. Nó build image production, tạo dự án Compose và cơ sở dữ liệu cô lập trên cổng 8093/33317, cấp tài khoản kiểm thử, áp dụng tường minh baseline quan sát và danh mục công khai, kiểm tra CLI đi kèm và binary runner/gate đa nền tảng, chạy bộ kiểm thử trình duyệt công khai. Container và volume được xóa sau đó. Ghi đè `LOOPFORGE_CONTAINER_TEST_PORT` và `LOOPFORGE_CONTAINER_MYSQL_PORT` khi cổng đã dùng. Lệnh gọi mô hình bị tắt trong kiểm tra cài mới này.
