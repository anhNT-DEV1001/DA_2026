# Task trong workspace

Mở `/workspaces/<slug>?tab=tasks` hoặc chọn tab **Task** trong trang chi tiết workspace.

- Dùng DataTable sẵn có: tìm tiêu đề, lọc trạng thái/người phụ trách/ưu tiên và phân trang phía server.
- Tạo task, bấm tiêu đề để xem/sửa, thay đổi trạng thái và xem lịch sử có phân trang.
- Ngày kế hoạch giữ nguyên chuỗi YYYY-MM-DD; không chuyển múi giờ.
- Chỉ đưa owner và thành viên đang hoạt động vào lựa chọn giao việc. Backend kiểm tra lại dữ liệu và quyền.
- PATCH chỉ gửi các trường đã thay đổi, cho phép sửa task đang giao cho thành viên đã rời workspace.
- Xóa có hộp thoại xác nhận; sau thao tác sẽ làm mới dữ liệu qua React Query.
- Nút thao tác theo quyền WORKSPACE_VIEW/CREATE/UPDATE/DELETE. Query cache phân biệt tài khoản và workspace.
- API gọi qua apiClient hiện có, dùng cookie và proxy `/api/v1`; không thêm thư viện.

## Cấu trúc

Tổ chức theo `features/workspaces`:

```text
tasks/
  components/
    workspace-tasks.tsx   # Bảng task và chọn chế độ xem
    task-dialog.tsx       # Form chi tiết và lịch sử từng task
    task-gantt.tsx        # Biểu đồ kế hoạch
    task-activity.tsx     # Timeline hoạt động workspace
    task-controls.tsx    # Select và thông báo lỗi dùng chung
    timeline-pages.tsx   # Điều khiển phân trang timeline
    index.ts
  hooks/
    useTask.ts           # React Query, query keys và làm mới cache
    index.ts
  services/
    task.service.ts      # Gọi HTTP API qua apiClient
    index.ts
  types/
    task.type.ts         # Kiểu dữ liệu task, bộ lọc và phản hồi API
    task-view.type.ts    # Props dùng chung cho các chế độ timeline
    index.ts
  index.ts
  README.md
```

Route `app/(home)/workspaces/[slug]/page.tsx` ghép màn hình và import từ
`@/features/tasks`, giống cách dùng feature Workspace. Task nằm trong workspace
nên tiếp tục dùng route workspace hiện có. Component sử dụng hooks; hooks gọi
services và quản lý cache; services sử dụng types. Giao diện giữ trạng thái form,
bộ lọc, phân trang và chế độ xem.

Timeline hoạt động gồm task đã xóa mềm. Chưa có màn hình thùng rác/khôi phục.

## Gantt và timeline

Trong tab Task, chọn Danh sách / Gantt / Timeline hoạt động.

- Gantt mặc định xem 31 ngày từ hôm nay, chọn tối đa 93 ngày, chuyển khoảng trước/sau.
- Backend lọc task giao với khoảng xem, không dùng dữ liệu của trang danh sách đang mở.
- Phân trang 50 task, hiển thị rõ tổng số và số dòng hiện tại. Cuộn ngang để xem ngày.
- Task có đủ hai ngày hiển thị thanh kéo dài, tính cả ngày kết thúc; chỉ có một ngày hiển thị tại ngày đó.
- Task không có ngày không nằm trên Gantt; lên lịch từ Danh sách. Task đã xóa không nằm trên biểu đồ.
- Thanh xanh lá cho trạng thái hoàn thành; xanh dương cho chưa hoàn thành; vạch đỏ chỉ hôm nay.
- Bấm tên/thanh task để mở form chi tiết và sửa ngày theo quyền; thao tác làm mới cả bảng và biểu đồ.
- Timeline tổng hợp 20 hoạt động/trang, mới nhất trước, hiển thị người thao tác và các trường đã thay đổi.
- Timeline chỉ gồm lịch sử task được backend ghi nhận; chưa có lịch sử thành viên/workspace.

Chưa bao gồm milestone riêng, quan hệ phụ thuộc, kéo thả thanh Gantt, bình luận và realtime.
Không cài thư viện mới; biểu đồ dùng React/CSS và bộ component hiện có.

Kiểm tra: `bun x tsc --noEmit`, `bun x eslint src/features/tasks`, `bun run build`.
Thử trên trình duyệt: tạo task có ngày, tìm/lọc, sửa trạng thái hoàn thành/mở lại,
xem lịch sử, thử ngày đảo ngược, rồi xóa và kiểm tra phân trang. Thử thêm tài khoản
chỉ có quyền xem để kiểm tra ẩn nút thao tác. Test API backend vẫn chạy bằng
`bun run test:tasks` trong thư mục backend.
