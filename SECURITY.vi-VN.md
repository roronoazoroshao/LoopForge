# Chính sách bảo mật

[English](SECURITY.md) | [简体中文](SECURITY.zh-CN.md) | Tiếng Việt

## Báo cáo lỗ hổng

Vui lòng sử dụng chức năng báo cáo riêng tư của GitHub Security Advisory để liên hệ với người bảo trì. Không gửi những nội dung sau trong Issue, Discussion hoặc Pull Request công khai:

- SecretId, SecretKey, Token, Cookie hoặc mật khẩu;
- Tên miền nội bộ, máy chủ, cụm máy chủ, bucket, topic hoặc ID pipeline;
- Nhật ký, dữ liệu người dùng hoặc tệp cấu hình chưa được che thông tin nhạy cảm.

Báo cáo nên bao gồm phiên bản bị ảnh hưởng, điều kiện tái hiện, tác động tiềm ẩn và phương án sửa lỗi đề xuất. Người bảo trì sẽ xác nhận đã nhận báo cáo trước, sau đó lên kế hoạch sửa lỗi và công bố thông tin dựa trên mức độ rủi ro.

## Phiên bản được hỗ trợ

Chỉ phiên bản ổn định mới nhất và nhánh mặc định được bảo trì. Các bản sửa lỗi bảo mật sẽ được đưa vào những bản phát hành vá lỗi tiếp theo.

## Trách nhiệm triển khai

Kho mã này không cung cấp thông tin xác thực production hoặc cấu hình vận hành. Bên triển khai nên sử dụng định danh có quyền tối thiểu, thông tin xác thực ngắn hạn hoặc hệ thống quản lý bí mật (Secret Manager) an toàn, đồng thời bảo đảm cấu hình cục bộ được loại trừ bằng `.gitignore`.
