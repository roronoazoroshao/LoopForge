// Product-owned Vietnamese demo conversations. IDs, role order and artifact filenames match the original fixture.
export const vietnameseConversations = [
  {
    "id": "home",
    "title": "Tối ưu trải nghiệm trang chủ không gian làm việc",
    "steps": [
      "Sắp xếp các cấp của không gian làm việc",
      "Thống nhất kích thước thanh bên",
      "Bổ sung tiêu chí nghiệm thu tương tác"
    ],
    "messages": [
      [
        "user",
        "Tham khảo trang chủ Grasp, giữ các chức năng nghiệp vụ hiện có và sắp xếp lại thanh bên cùng tương tác của nút."
      ],
      [
        "assistant",
        "Trước hết, tôi chia không gian làm việc thành lối tắt thường dùng, điều hướng hội thoại và vùng nội dung. Thanh lối tắt giữ rộng 56px, thanh hội thoại rộng 304px, nền trắng, trạng thái chọn màu xám nhạt và đường viền mảnh.\n\nCác chức năng cần giữ gồm: chọn dự án và mô hình, tham chiếu tệp, tìm kiếm, lưu trữ và đổi tên hội thoại. Biểu tượng tự chạy hiệu ứng, nút giữ nguyên vị trí."
      ],
      [
        "user",
        "Gộp cài đặt và máy thực thi lại, đừng chiếm hai lối vào."
      ],
      [
        "assistant",
        "Đã gộp lối vào trong Cài đặt; mặc định mở cấu hình cá nhân. Máy thực thi vẫn mở được từ danh sách cài đặt. Nhấp biểu tượng bánh răng lần nữa để về trang chủ; nút cạnh tiêu đề thu gọn điều hướng cài đặt.\n\n**Đã hoàn thành**: kích thước thanh bên, gộp lối vào, đường viền và màu khi rê chuột.\n\n**Chờ xác nhận**: cách rút gọn tiêu đề dài và không gian đọc khi mở thanh bên trên màn hình hẹp. Sau khi xác nhận có thể kết thúc đợt cải tiến trang chủ."
      ]
    ]
  },
  {
    "id": "release",
    "title": "Sắp xếp danh sách phát hành và tiêu chí nghiệm thu tuần này",
    "steps": [
      "Tổng hợp thay đổi trong tuần",
      "Kiểm tra người phụ trách và tiêu chí nghiệm thu",
      "Tổng hợp trở ngại phát hành"
    ],
    "messages": [
      [
        "user",
        "Hãy sắp xếp nội dung phát hành tuần này theo người phụ trách và trạng thái nghiệm thu."
      ],
      [
        "assistant",
        "Phạm vi phát hành tuần này gồm ba mục:\n\n| Nội dung | Người phụ trách | Trạng thái nghiệm thu |\n| --- | --- | --- |\n| Khôi phục trạng thái đăng nhập | Lâm Duyệt | Máy tính đã đạt, chờ kiểm thử hồi quy trên di động |\n| Thông báo hoàn tất tác vụ | Trần Mặc | Chờ xác nhận tùy chọn mặc định |\n| Tìm kiếm danh sách dự án | Chu Ninh | Đã đạt luồng thông thường và không có kết quả |\n\nCó thể chuẩn bị ghi chú phát hành trước. Thời điểm phát hành cần chờ xác nhận hai mục đầu."
      ],
      [
        "user",
        "Liệt kê riêng các trở ngại và đề xuất thứ tự xử lý."
      ],
      [
        "assistant",
        "Hiện có hai trở ngại phát hành:\n\n1. **Khôi phục đăng nhập trên di động**: Lâm Duyệt bổ sung kết quả kiểm thử hồi quy khi tải lại và mở lại trang trên Safari.\n2. **Tùy chọn thông báo mặc định**: Trần Mặc xác nhận thông báo nào được bật mặc định cho người dùng mới để tránh nhắc lặp sau phát hành.\n\nNên hoàn thành hồi quy di động trước, sau đó xác nhận nội dung và giá trị mặc định của thông báo, cuối cùng chạy nghiệm thu phát hành. Tìm kiếm dự án đã đạt và có thể đưa thẳng vào danh sách phát hành."
      ]
    ]
  },
  {
    "id": "flow",
    "title": "Thiết kế quy trình phối hợp từ phân tích yêu cầu đến kiểm thử",
    "steps": [
      "Xác định đầu vào và đầu ra của từng giai đoạn",
      "Bổ sung bước xác nhận thủ công",
      "Xác định luồng quay lại khi kiểm thử không đạt"
    ],
    "messages": [
      [
        "user",
        "Tôi muốn nối phân tích yêu cầu, phát triển và kiểm thử thành một quy trình phối hợp. Hãy thiết kế trước."
      ],
      [
        "assistant",
        "Mỗi giai đoạn nên có một kết quả rõ ràng:\n\n- **Làm rõ yêu cầu**: mục tiêu, phạm vi và tiêu chí nghiệm thu.\n- **Rà soát phương án**: phương án triển khai, phạm vi ảnh hưởng và rủi ro chính.\n- **Triển khai**: thay đổi mã nguồn và kết quả tự kiểm thử.\n- **Kiểm thử nghiệm thu**: kết quả hồi quy và vấn đề còn tồn đọng.\n\nNếu kiểm thử không đạt, quay lại bước phát triển để tránh bàn giao khi còn vấn đề chưa giải quyết."
      ],
      [
        "user",
        "Thêm xác nhận thủ công trước khi phát triển và cho phép quay lại khi kiểm thử thất bại."
      ],
      [
        "assistant",
        "Đặt xác nhận thủ công sau bước rà soát phương án:\n\n```mermaid filename=需求协作流程.mmd\nflowchart TD\n  A[Làm rõ yêu cầu] --> B[Rà soát phương án]\n  B --> C{Xác nhận thủ công}\n  C -->|Đạt| D[Triển khai]\n  C -->|Bổ sung thông tin| A\n  D --> E[Kiểm thử nghiệm thu]\n  E -->|Không đạt| D\n  E -->|Đạt| F[Lưu trữ bàn giao]\n```\n\nMỗi lần quay lại đều ghi lý do và mục cần sửa; các xác nhận đã đạt vẫn được giữ. Quy trình đã được bổ sung, tiếp theo cần xác định người phụ trách xác nhận thủ công và người nghiệm thu cuối cùng."
      ]
    ]
  },
  {
    "id": "mobile",
    "title": "Kiểm tra bố cục và trải nghiệm thao tác trên di động",
    "steps": [
      "Kiểm tra phân bổ không gian trên màn hình hẹp",
      "Xác định vấn đề che khuất ô nhập",
      "Liệt kê luồng nghiệm thu trên di động"
    ],
    "messages": [
      [
        "user",
        "Kiểm tra những phần cần tối ưu trên điện thoại, nhất là thanh bên và ô nhập."
      ],
      [
        "assistant",
        "Trên màn hình hẹp cần ưu tiên ba việc:\n\n1. Khi mở, thanh bên phủ vùng nội dung; khi thu gọn, khôi phục toàn bộ chiều rộng đọc.\n2. Tiêu đề dài chỉ chiếm một dòng; các thao tác khác vẫn bấm được.\n3. Ô nhập tăng chiều cao theo nội dung nhưng giữ vị trí chọn mô hình và nút gửi.\n\nĐợt này ưu tiên hai chiều rộng phổ biến 390px và 430px."
      ],
      [
        "user",
        "Giải quyết việc thanh bên chiếm quá nhiều chỗ trước, rồi kiểm tra khi bàn phím bật lên."
      ],
      [
        "assistant",
        "Thanh bên chuyển sang dạng phủ; khi đóng không còn cột trống. Bảng cài đặt sử dụng cách mở và thu gọn tương tự.\n\n**Tiến độ hiện tại**: đã sắp xếp chiều rộng điều hướng và cách xử lý tiêu đề dài.\n\n**Tiếp theo**: kiểm tra ô nhập và nút gửi khi bàn phím điện thoại bật lên, cũng như khả năng trả tiêu điểm về ô nhập khi đóng thanh bên. Bố cục nhiều cột trên máy tính vẫn được giữ."
      ]
    ]
  },
  {
    "id": "search",
    "title": "Bổ sung tìm kiếm và bộ lọc cho danh sách dự án",
    "messages": [
      [
        "user",
        "Ngày càng có nhiều dự án. Thêm tìm kiếm và bộ lọc các dự án tôi tham gia."
      ],
      [
        "assistant",
        "Tìm kiếm theo tên và mô tả dự án. Bộ lọc có tất cả dự án và dự án tôi tham gia. Hai chức năng có thể kết hợp; từ khóa được giữ nguyên khi đổi bộ lọc.\n\nKhi không có kết quả, hiển thị điều kiện hiện tại và nút xóa tìm kiếm. Khi chưa có dự án nào, vẫn giữ thao tác tạo dự án."
      ],
      [
        "user",
        "Xử lý cả khoảng trắng và chữ hoa, chữ thường. Khi đổi bộ lọc đừng chuyển sang trang khác."
      ],
      [
        "assistant",
        "Đã đưa khoảng trắng đầu cuối và khác biệt chữ hoa, chữ thường vào quy tắc so khớp. Tìm kiếm và bộ lọc chỉ cập nhật dữ liệu danh sách, không đổi vị trí trang.\n\nNghiệm thu bao gồm tên tiếng Trung, chữ hoa và chữ thường tiếng Anh, toàn khoảng trắng, không có kết quả và kết hợp bộ lọc. Các kết quả đều như mong đợi; chi tiết dự án, tạo mới và quản lý thành viên vẫn dùng được."
      ]
    ]
  },
  {
    "id": "settings",
    "title": "Gộp cấu hình cá nhân và cài đặt không gian làm việc",
    "messages": [
      [
        "user",
        "Cấu hình cá nhân và không gian làm việc đang tách riêng hơi khó tìm. Hãy gộp thành một lối vào cài đặt."
      ],
      [
        "assistant",
        "Có thể dùng Cài đặt làm lối vào chung, mặc định hiển thị cấu hình cá nhân rồi chia nhóm quản lý:\n\n- Cấu hình cá nhân và giao diện không gian làm việc\n- Cấu hình dự án và quản lý bot\n- Quy trình, vai trò và tài nguyên năng lực\n- Máy thực thi và môi trường chạy\n\nCác biểu mẫu giữ nguyên cách lưu; điều hướng chỉ tổ chức lại lối vào."
      ],
      [
        "user",
        "Mở Cài đặt mặc định vào cấu hình cá nhân. Nhấp bánh răng lần nữa thì về trang chủ."
      ],
      [
        "assistant",
        "Đã sắp xếp theo tương tác này: nhấp bánh răng lần đầu mở cấu hình cá nhân; nhấp lần nữa trong Cài đặt để về trang chủ. Nút cạnh tiêu đề chỉ thu gọn điều hướng, giữ trang cấu hình hiện tại.\n\nĐã kiểm tra ba luồng cấu hình cá nhân, dự án và máy thực thi. Bánh răng chung đều đưa về trang chủ; thanh bên hội thoại vẫn giữ trạng thái mở riêng."
      ]
    ]
  },
  {
    "id": "icons",
    "title": "Làm hiệu ứng biểu tượng tự nhiên hơn",
    "messages": [
      [
        "user",
        "Khi rê chuột lên nút, đừng để nút nhảy lên xuống; chỉ cần biểu tượng tự chạy hiệu ứng."
      ],
      [
        "assistant",
        "Sẽ bỏ dịch chuyển và phóng to thu nhỏ của nút, giữ hiệu ứng nét vẽ bên trong biểu tượng. Phản hồi khi rê chuột chủ yếu dùng nền xám nhạt và hiệu ứng lan nhẹ tại điểm tương tác; trạng thái chọn dùng màu xám ổn định.\n\nKhi điều hướng bằng bàn phím vẫn có phản hồi; nếu hệ thống bật giảm chuyển động thì rút ngắn hiệu ứng."
      ],
      [
        "user",
        "Nút hội thoại mới đừng nổi lên; thống nhất biểu tượng cài đặt và điều hướng."
      ],
      [
        "assistant",
        "Đã bỏ bóng nổi của nút hội thoại mới; điều hướng và cài đặt dùng cùng bảng màu trung tính. Biểu tượng có thể chạy hiệu ứng bên trong, còn biên nút và vị trí chữ giữ nguyên.\n\nĐã kiểm tra rê chuột, tiêu điểm bàn phím, chạm và trạng thái vô hiệu hóa. Rê chuột vào ra liên tục không làm bố cục giật. Có thể nghiệm thu đợt cải tiến tương tác này."
      ]
    ]
  },
  {
    "id": "review",
    "title": "Sắp xếp vấn đề còn tồn đọng trong rà soát mã",
    "messages": [
      [
        "user",
        "Hãy sắp xếp ý kiến rà soát, xử lý vấn đề ảnh hưởng đến sử dụng trước; đề xuất về kiểu dáng để sau."
      ],
      [
        "assistant",
        "Ý kiến rà soát được chia làm ba nhóm:\n\n| Ưu tiên | Vấn đề | Cách xử lý |\n| --- | --- | --- |\n| Cao | Giữ bộ lọc cũ sau khi đổi dự án | Đặt lại trạng thái danh sách khi đổi dự án |\n| Trung bình | Trang không có kết quả thiếu lối khôi phục | Thêm thao tác xóa bộ lọc |\n| Thấp | Khoảng cách hàng không đồng nhất | Thống nhất chiều cao hàng và khoảng đệm |\n\nHai mục đầu ảnh hưởng đến luồng thao tác; nên sửa và kiểm thử hồi quy trước."
      ],
      [
        "user",
        "Xử lý hai mục đầu, rồi kiểm tra có làm mất lựa chọn của người dùng không."
      ],
      [
        "assistant",
        "Đã xử lý hai mục đầu, kết quả hồi quy như sau:\n\n- Đổi dự án sẽ xóa bộ lọc không còn phù hợp và không tiếp tục hiển thị dữ liệu của dự án cũ.\n- Trang không có kết quả có thể xóa điều kiện bằng một thao tác để trở lại danh sách đầy đủ.\n- Mô hình và giao diện không gian làm việc người dùng đã chọn không bị ghi đè khi làm mới danh sách.\n\nĐiều chỉnh khoảng cách còn lại đã được ghi riêng để xử lý cùng đợt cải tiến giao diện tiếp theo."
      ]
    ]
  },
  {
    "id": "docs",
    "title": "Bổ sung tài liệu làm quen dự án cho đồng nghiệp mới",
    "messages": [
      [
        "user",
        "Đồng nghiệp mới chưa biết bắt đầu từ đâu. Hãy bổ sung tài liệu làm quen dự án."
      ],
      [
        "assistant",
        "Tài liệu sẽ tập trung vào lần phối hợp đầu tiên: tham gia dự án, kiểm tra cấu hình cá nhân, chọn mô hình, bắt đầu hội thoại, xem sản phẩm đầu ra và xác nhận bàn giao.\n\nChi tiết cài đặt tách riêng ở phần môi trường phát triển để màn hình đầu không quá tải cấu hình. Khi thiếu quyền, hướng dẫn liên hệ người phụ trách dự án."
      ],
      [
        "user",
        "Viết luồng thao tác ngắn nhất, thêm câu hỏi thường gặp."
      ],
      [
        "assistant",
        "Đã soạn tài liệu làm quen:\n\n```markdown filename=项目上手指南.md\n# Hướng dẫn làm quen dự án\n\n## Hoàn thành lần phối hợp đầu tiên\n1. Tìm dự án của nhóm trong danh sách và xác nhận đã tham gia.\n2. Mở Cài đặt, kiểm tra thông tin xác thực mô hình trong cấu hình cá nhân.\n3. Trở về không gian làm việc, chọn dự án và mô hình.\n4. Tạo hội thoại, nêu mục tiêu, ràng buộc và tiêu chí nghiệm thu.\n5. Xem tài liệu và sơ đồ trong bảng sản phẩm đầu ra, xác nhận bước tiếp theo.\n\n## Câu hỏi thường gặp\n- Không thấy dự án: nhờ người phụ trách kiểm tra quyền thành viên.\n- Không gửi được tin nhắn: kiểm tra thông tin xác thực mô hình và kết nối mạng.\n- Chưa biết cách nêu yêu cầu: viết vấn đề cần giải quyết trước, rồi bổ sung tình huống sử dụng.\n\n## Kiểm tra trước bàn giao\n- Tiêu chí nghiệm thu đã đủ chưa?\n- Vấn đề còn tồn đọng đã có người phụ trách chưa?\n- Có tìm lại được sản phẩm đầu ra từ hội thoại không?\n```\n\nĐã bổ sung luồng ngắn nhất và câu hỏi thường gặp. Có thể để đồng nghiệp mới thử từng bước rồi cập nhật theo vướng mắc thực tế."
      ]
    ]
  },
  {
    "id": "runners",
    "title": "Kiểm tra trạng thái kết nối máy thực thi",
    "messages": [
      [
        "user",
        "Máy thực thi đôi khi hiển thị ngoại tuyến. Hãy sắp xếp thứ tự kiểm tra."
      ],
      [
        "assistant",
        "Nên kiểm tra theo bốn cấp: tín hiệu heartbeat, mạng, thông tin xác thực và phiên bản:\n\n1. Xem heartbeat gần nhất để phân biệt trễ ngắn hạn và ngoại tuyến kéo dài.\n2. Xác nhận tiến trình dịch vụ và kết nối mạng trên máy thực thi.\n3. Kiểm tra thông tin xác thực kết nối có hết hạn hoặc bị thu hồi không.\n4. Đối chiếu phiên bản máy khách với yêu cầu trên bảng điều khiển.\n\nGhi lại tác vụ hiện tại trước khi kiểm tra để tránh mất ngữ cảnh khi kết nối lại."
      ],
      [
        "user",
        "Giải thích rõ khác biệt giữa ngoại tuyến và đang bận để dễ nhận định khi trực."
      ],
      [
        "assistant",
        "Đã bổ sung giải thích trạng thái:\n\n- **Trực tuyến, rảnh**: heartbeat bình thường, có thể nhận tác vụ mới.\n- **Trực tuyến, đang bận**: heartbeat bình thường, đang xử lý tác vụ.\n- **Ngoại tuyến**: quá ngưỡng heartbeat, cần kiểm tra tiến trình và kết nối.\n\nĐã tổng hợp thứ tự kiểm tra và trạng thái. Với máy đang bận, xem tác vụ hiện tại trước; nếu ngoại tuyến kéo dài thì kiểm tra dịch vụ. Không ngắt trực tiếp công việc chỉ vì trạng thái danh sách."
      ]
    ]
  },
  {
    "id": "notify",
    "title": "Tối ưu thông báo sau khi tác vụ hoàn tất",
    "messages": [
      [
        "user",
        "Có quá nhiều thông báo sau khi tác vụ kết thúc. Hãy tách thành công, thất bại và trường hợp cần tôi xác nhận."
      ],
      [
        "assistant",
        "Nên phân theo việc bạn có cần hành động hay không:\n\n- Hoàn tất thông thường: tổng hợp vào không gian làm việc, không bật nhắc lặp.\n- Thực thi thất bại: giữ nguyên nguyên nhân và lối xử lý lại.\n- Chờ xác nhận: nêu rõ nội dung cần xác nhận và bước tiếp theo.\n\nGộp cập nhật trạng thái cùng tác vụ để tránh biến thông tin tiến trình thành nhiều thông báo mới."
      ],
      [
        "user",
        "Phải luôn tìm lại được mục chờ xác nhận, kể cả sau khi đã đọc."
      ],
      [
        "assistant",
        "Đã bổ sung quy tắc thông báo: đã đọc chỉ thay đổi trạng thái đọc, không xóa mục chờ xác nhận. Chỉ thu mục khỏi danh sách việc cần làm khi xác nhận hoàn tất; vẫn xem được lịch sử.\n\nNghiệm thu bao gồm bốn luồng: hoàn tất thông thường, thất bại liên tiếp, sự kiện lặp và mở lại sau khi đọc. Có thể giảm số thông báo mà vẫn giữ đầy đủ lối xử lý lỗi và xác nhận thủ công."
      ]
    ]
  },
  {
    "id": "summary",
    "title": "Tổng hợp hồ sơ bàn giao của đợt phát triển này",
    "messages": [
      [
        "user",
        "Hãy tổng hợp các điều chỉnh của đợt này thành hồ sơ bàn giao, nêu thay đổi và việc còn lại."
      ],
      [
        "assistant",
        "Có thể lưu hồ sơ theo ba phần: điều hướng, tương tác và năng lực phối hợp. Hồ sơ giữ cả kết quả nghiệm thu và việc theo dõi để đợt sau tiếp tục thuận tiện.\n\nCần nêu rõ các chức năng cũ vẫn truy cập được sau khi gộp lối vào, và thu gọn thanh bên không ảnh hưởng hội thoại hay trang cấu hình hiện tại."
      ],
      [
        "user",
        "Thêm kết quả xác minh và người phụ trách tiếp theo, viết ngắn gọn."
      ],
      [
        "assistant",
        "Đã tổng hợp hồ sơ bàn giao:\n\n```markdown filename=迭代交付记录.md\n# Hồ sơ bàn giao đợt phát triển\n\n## Đã hoàn thành\n- Thống nhất chiều rộng, đường viền và màu chọn của điều hướng không gian làm việc và cài đặt.\n- Gộp lối vào cấu hình cá nhân, quản lý không gian làm việc và máy thực thi.\n- Điều chỉnh hiệu ứng biểu tượng và chuyển tiếp nút, giữ vị trí điều khiển ổn định.\n- Hoàn thiện luồng tìm kiếm, lưu trữ hội thoại và xem sản phẩm đầu ra.\n\n## Kết quả xác minh\n- Các luồng điều hướng chính trên máy tính và di động đều đạt.\n- Thu gọn và mở Cài đặt giữ nguyên trang hiện tại.\n- Nội dung hội thoại, mô hình đã chọn và ngữ cảnh dự án nhất quán.\n\n## Việc tiếp theo\n- Lâm Duyệt: bổ sung ghi nhận thao tác khi bàn phím điện thoại bật lên.\n- Trần Mặc: thu thập phản hồi lần đầu sử dụng, xác nhận nội dung hướng dẫn.\n```\n\nCác mục đã hoàn thành và người phụ trách tiếp theo đã được phân định, có thể dùng làm căn cứ bàn giao."
      ]
    ]
  }
];
