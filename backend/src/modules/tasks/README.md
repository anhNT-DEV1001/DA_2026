# Task — dữ liệu và API

Đã có dữ liệu, API CRUD, phân quyền theo workspace và lịch sử thay đổi task.
Chưa nối giao diện frontend.

## Mô hình

- `tasks`: thuộc một workspace, có tiêu đề, mô tả, trạng thái, tối đa một
  người phụ trách (`assignee_id`), mức ưu tiên, ngày bắt đầu, hạn hoàn thành,
  thời điểm hoàn thành và các trường audit/xóa mềm.
- `task_statuses`: trạng thái riêng của từng workspace. Bốn mã mặc định:
  `todo`, `in_progress`, `in_review`, `done`. `done` có `is_completed = true`.
- `task_activities`: lưu người thao tác, hành động `created`/`updated`/`deleted`,
  snapshot trước/sau và thời điểm ghi. Ghi cùng transaction với task; không có
  API sửa/xóa lịch sử. Xóa mềm task giữ lịch sử, xóa vật lý task sẽ xóa lịch sử theo.
- `start_date` và `due_date` là ngày (`YYYY-MM-DD`), nullable để hỗ trợ việc
  chưa lên lịch. `completed_at` là `timestamptz`.
- Ưu tiên: `low`, `medium` (mặc định), `high`, `urgent`.
- Ngày bắt đầu không được sau hạn hoàn thành. Trạng thái của task phải thuộc
  cùng workspace, được bảo vệ bằng khóa ngoại ghép ở PostgreSQL.

Migration bổ sung trạng thái mặc định cho các workspace hiện có chưa bị xóa
mềm. Workspace tạo mới được khởi tạo trạng thái trong cùng transaction với
workspace và thành viên mặc định. Gọi lại khởi tạo không tạo trùng hoặc ghi
đè tên trạng thái đã chỉnh sửa.

## Chạy trên Windows / PowerShell

Tại thư mục `backend`, sau khi PostgreSQL đã chạy:

```powershell
bun run test:tasks
bun run migration:run
bun run migration:show
```

Kiểm thử sử dụng cấu hình `.env`, tạo schema tạm trong một transaction rồi
rollback toàn bộ. Không tạo tài khoản hoặc task mẫu trong dữ liệu ứng dụng.
Tài khoản PostgreSQL chạy kiểm thử cần quyền tạo schema.

Migration `CreateTaskFoundation1792425600000` chỉ thêm hai bảng, các chỉ mục,
ràng buộc và trạng thái mặc định. Hàm `down` xóa hai bảng này, nên rollback
migration sau khi đã có task sẽ mất dữ liệu task/trạng thái.

Migration `CreateTaskActivities1792429200000` thêm bảng lịch sử. `down` chỉ xóa
bảng lịch sử, không xóa task. Không tạo lịch sử giả cho task đã tồn tại trước migration.

## API (phần 2)

Tiền tố: `/api/v1/workspaces/:workspaceId/tasks`. Dùng cookie đăng nhập như các
API hiện có. Kết quả được interceptor chung bọc trong `data`.

| Method | Đường dẫn sau tiền tố | Chức năng                      | Quyền chức năng  |
| ------ | --------------------- | ------------------------------ | ---------------- |
| GET    | `/statuses`           | Các trạng thái của workspace   | WORKSPACE_VIEW   |
| GET    | (trống)               | Danh sách task                 | WORKSPACE_VIEW   |
| GET    | `/:taskId`            | Chi tiết task                  | WORKSPACE_VIEW   |
| GET    | `/:taskId/activities` | Lịch sử, kể cả task đã xóa mềm | WORKSPACE_VIEW   |
| POST   | (trống)               | Tạo task                       | WORKSPACE_CREATE |
| PATCH  | `/:taskId`            | Sửa task                       | WORKSPACE_UPDATE |
| DELETE | `/:taskId`            | Xóa mềm                        | WORKSPACE_DELETE |

Mọi endpoint đồng thời yêu cầu người gọi là chủ sở hữu hoặc thành viên đang
hoạt động của workspace. Tạm chấp nhận cả `MS001` và giá trị cũ `active`.
Quyền chức năng, kể cả quyền của root, không bỏ qua kiểm tra này. Thành viên đủ
quyền thao tác được trên mọi task trong workspace, không chỉ task được giao.
Chưa bổ sung quyền `TASK_*` riêng hay thay đổi cơ chế vai trò hiện tại.

POST ví dụ (lấy `statusId` từ `/statuses`, có thể bỏ để mặc định `todo`):

```json
{
  "title": "Thiết kế API workspace",
  "description": "Bổ sung kế hoạch công việc",
  "priority": "high",
  "assigneeId": null,
  "startDate": "2026-10-20",
  "dueDate": "2026-10-22"
}
```

PATCH dùng cùng các trường, chỉ gửi trường cần đổi. `description`, `assigneeId`,
`startDate`, `dueDate` nhận `null` để xóa giá trị. `title`, `statusId`, `priority`
không nhận `null`. Không nhận `workspaceId`, người tạo/sửa hoặc `completedAt`
từ client. Tiêu đề được trim, tối đa 255 ký tự; mô tả tối đa 20.000 ký tự.
Người được giao phải còn tồn tại, chưa bị xóa mềm và là owner/thành viên hoạt động.
Nếu người cũ đã rời workspace, vẫn có thể sửa các trường khác hoặc bỏ giao việc;
không thể giao lại cho người đó.

Ngày đúng định dạng `YYYY-MM-DD` và là ngày lịch hợp lệ. Khi PATCH chỉ một ngày,
backend so sánh với ngày còn lại đang lưu. Có thể chuyển giữa các trạng thái
trong cùng workspace; chưa giới hạn thứ tự chuyển. Trạng thái có
`isCompleted=true` tự ghi `completedAt`, giữ nguyên khi sửa task đã hoàn thành,
và xóa giá trị khi chuyển về trạng thái chưa hoàn thành. PATCH không thay đổi
dữ liệu sẽ không tạo thêm lịch sử.

Danh sách hỗ trợ `page` (mặc định 1), `limit` (mặc định 20, tối đa 100), `search`
(tìm tiêu đề), `statusId`, `assigneeId`, `priority`. Lịch sử hỗ trợ `page`/`limit`.
Trả `{ items, meta }` với meta chuẩn của dự án: `page`, `limit`, `itemCount`,
`pageCount`, `hasPreviousPage`, `hasNextPage`. Danh sách và lịch sử xếp ID giảm dần.
Task trả `assigneeId`, không trả entity User/password; status lấy từ `/statuses`.

Kiểm thử HTTP dùng danh tính fixture trong guard chỉ dành cho test và
PermissionGuard thật. Không thay đổi xác thực JWT của ứng dụng. Kiểm thử bao
gồm validation, phạm vi workspace, chuyển trạng thái, xóa mềm và rollback khi
ghi lịch sử thất bại; chưa kiểm thử đồng thời nhiều kết nối hoặc luồng đăng nhập JWT.

## API Gantt / timeline

- GET `/api/v1/workspaces/:workspaceId/tasks?from=2026-10-01&to=2026-10-31`:
  lọc task giao với khoảng ngày (bao gồm hai đầu mút), kết hợp các bộ lọc/phân trang hiện có.
  Phải gửi cả `from` và `to`; tối đa 366 ngày. Task chỉ có một ngày được tính tại ngày đó;
  task chưa có ngày và task đã xóa mềm không nằm trong kết quả.
- GET `/api/v1/workspaces/:workspaceId/tasks/activities?page=1&limit=20`:
  tổng hợp lịch sử task trong workspace, kể cả task đã xóa mềm, ID giảm dần.
  Không trả entity User. Quyền WORKSPACE_VIEW và owner/thành viên hoạt động đều bắt buộc.
- Không cần migration mới. Kiểm thử có phạm vi workspace, phân trang, khoảng ngày và lịch sử sau xóa mềm.

## Phần tiếp theo

Milestone riêng và quan hệ phụ thuộc giữa các task. Lịch sử thành viên/workspace, bình luận và realtime
chưa nằm trong phần này. Các API workspace cũ cần đợt kiểm tra quyền riêng.
