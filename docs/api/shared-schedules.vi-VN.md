# Tác vụ AI theo lịch dùng chung và đăng ký của dự án

Định nghĩa dùng chung là phiên bản phát hành bất biến; đăng ký của dự án vẫn là một `ScheduleJob` độc lập. Không sao chép prompt, không kế thừa thông tin xác thực, Bot hoặc hồ sơ thực thi của dự án phát hành. Phiên bản mới không thay đổi đăng ký hiện có.

- `GET /api/shared-schedule-tasks`: liệt kê phiên bản mới nhất của tác vụ đã phát hành, phản hồi dạng mảng; người dùng đã đăng nhập nền tảng có thể duyệt định nghĩa dùng chung.
- `GET /api/shared-schedule-tasks/{id}/versions`: trả về định nghĩa bất biến theo thứ tự phiên bản giảm dần; tác vụ không tồn tại trả 404.
- `POST /api/schedule-jobs/{id}/publish`: phát hành phiên bản dùng chung từ tác vụ AI độc lập. Người gọi phải có quyền ghi dự án nguồn. Body gồm `name, description, prompt, parameters, changeNote, baseVersion`. Lần đầu baseVersion=0, sau đó dùng phiên bản mới nhất hiện tại; cập nhật đồng thời xung đột trả 409. Không thể phát hành lại cấu hình kích hoạt và đăng ký.
- `PUT/POST /api/schedule-jobs`: đăng ký điền `skipDispatch=true, sharedTaskId, sharedTaskVersion, parameterValues, projectId`. Phải chỉ định rõ phiên bản. Tham số được kiểm tra khi lưu; không lưu prompt sao chép. Tên, thời gian, mô hình, trạng thái bật và thông báo vẫn thuộc dự án này. Khi tạo lần đầu, nếu bỏ qua thời gian/mô hình thì dùng mặc định của phiên bản phát hành đã chọn.
- Nâng cấp dùng lại giao diện lưu, sửa rõ `sharedTaskVersion`. Tham số được kiểm tra lại theo định nghĩa mới; không tự nâng cấp. Tác vụ đang chạy vẫn dùng phiên bản khi bắt đầu; các lần sau dùng phiên bản đã lưu.
- Đọc, lưu, chạy và xóa đăng ký mới được kiểm tra theo quyền dự án đích; thực thi dùng thông tin xác thực của Owner dự án đích. Người phát hành không thể có quyền ghi dự án đăng ký thông qua định nghĩa dùng chung.

Cấu trúc tham số: `{name,label,type,required,default}`, type là string/integer/number/boolean; mọi giá trị là chuỗi. Prompt dùng `{{params.days}}`. Tối đa 20 tham số, tên duy nhất; định nghĩa thiếu, tham số lạ, thiếu trường bắt buộc hoặc sai kiểu trả 400. Giá trị mặc định chỉ áp dụng cho trường chưa gửi; giá trị rỗng rõ ràng không thể vượt qua kiểm tra bắt buộc. Bản thân prompt không giới hạn độ dài, thay thế một lần và giữ nguyên biểu thức mẫu trong tham số.

```json
{"name":"需求停滞巡检","prompt":"检查超过 {{params.days}} 天未更新的需求，汇总实际结果。","parameters":[{"name":"days","label":"停滞天数","type":"integer","required":true,"default":"3"}],"baseVersion":0,"changeNote":"首次发布"}
```

Phiên bản sau phát hành chỉ lưu định nghĩa tác vụ và lịch khuyến nghị. Xóa tác vụ nguồn không ảnh hưởng phiên bản đã phát hành hoặc đăng ký, phiên bản không bị cắt bớt theo cửa sổ lưu lịch sử định nghĩa chung. Phiên bản đầu không hỗ trợ xóa phiên bản, nâng cấp tự động hoặc kế thừa định danh thực thi.
