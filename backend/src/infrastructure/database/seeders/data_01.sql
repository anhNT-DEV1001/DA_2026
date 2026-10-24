-- ==========================================
-- 1. SEED BẢNG MASTER_DATA
-- ==========================================
-- Bảng không có unique (group, value) nên dùng NOT EXISTS để chạy lại không bị trùng
INSERT INTO "master_data" (
    "created_by", "updated_by", "group", "value", "name", "name_group", "description", "displayOrder"
)
SELECT 1, 1, v.* FROM (VALUES
    ('ACTION', 'ACTION001', 'Xem', 'Thao tác', 'Thao tác - Xem', 1),
    ('ACTION', 'ACTION002', 'Thêm', 'Thao tác', 'Thao tác - Thêm', 2),
    ('ACTION', 'ACTION003', 'Sửa', 'Thao tác', 'Thao tác - Sửa', 3),
    ('ACTION', 'ACTION004', 'Xóa', 'Thao tác', 'Thao tác - Xóa', 4),
    ('ACTION', 'ACTION005', 'Khóa', 'Thao tác', 'Thao tác - Khóa', 5),
    ('ACTION', 'ACTION006', 'Duyệt', 'Thao tác', 'Thao tác - Duyệt', 6),
    ('ACTION', 'ACTION007', 'Phân quyền', 'Thao tác', 'Thao tác - Phân quyền', 7),
    ('GENDER', 'GENDER001', 'Nam', 'Giới tính', 'Giới tính - Nam', 1),
    ('GENDER', 'GENDER002', 'Nữ', 'Giới tính', 'Giới tính - Nữ', 2),
    ('GENDER', 'GENDER003', 'Khác', 'Giới tính', 'Giới tính - Khác', 3),
    -- Chế độ workspace (cột workspaces.mode)
    ('WSM', 'WSM001', 'Riêng tư', 'Chế độ không gian làm việc', 'Chế độ - Riêng tư', 1),
    ('WSM', 'WSM002', 'Công khai', 'Chế độ không gian làm việc', 'Chế độ - Công khai', 2),
    -- Trạng thái thành viên workspace (cột workspace_members.status)
    ('MS', 'MS001', 'Tham gia', 'Trạng thái thành viên', 'Thành viên - Tham gia', 1),
    ('MS', 'MS002', 'Chờ duyệt', 'Trạng thái thành viên', 'Thành viên - Chờ duyệt', 2),
    ('MS', 'MS003', 'Từ chối', 'Trạng thái thành viên', 'Thành viên - Từ chối', 3)
) AS v("group", "value", "name", "name_group", "description", "displayOrder")
WHERE NOT EXISTS (
    SELECT 1 FROM "master_data" m WHERE m."group" = v."group" AND m."value" = v."value"
);

-- Chuyển dữ liệu cũ (mode private/public, status active) sang mã master-data
DELETE FROM "master_data" WHERE "group" = 'WSM' AND "value" IN ('private', 'public');
UPDATE "workspaces" SET "mode" = 'WSM001' WHERE "mode" = 'private';
UPDATE "workspaces" SET "mode" = 'WSM002' WHERE "mode" = 'public';
UPDATE "workspace_members" SET "status" = 'MS001' WHERE "status" = 'active';

-- ==========================================
-- 2. SEED BẢNG ROLES
-- ==========================================
INSERT INTO "roles" (
    "id", "created_by", "updated_by", "name", "description"
) VALUES
    (1, NULL, NULL, 'root', 'Quản trị hệ thống'),
    (2, NULL, NULL, 'user', 'Người dùng cơ bản')
ON CONFLICT ("name") DO NOTHING;

-- Đồng bộ lại sequence id cho bảng roles
SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 1), true);

-- ==========================================
-- 3. SEED BẢNG MENUS (Sắp xếp menu cha trước, menu con sau)
-- ==========================================
INSERT INTO "menus" (
    "id", "created_by", "updated_by", "name", "route", "icon", "alias", "parent_id", "displayOrder", "isSideBarDisplay", "is_active"
) VALUES
    (1, 1, 1, 'Trang chủ', '/', 'Home', 'HomePage', NULL, 1, true, true),
    (9, 1, 1, 'Dasboard', 'dashboard', 'ChartColumnDecreasing', 'Dashboard', NULL, 2, true, true),
    (10, 1, 1, 'Task', '/task', 'ListChecks', 'Task', NULL, 3, true, true),
    (11, 1, 1, 'Hội thoại', '/chats', 'MessagesCircle', 'Chat', NULL, 4, true, true),
    (2, 1, 1, 'Hệ thống', '/system', 'Settings', 'System', NULL, 5, true, true),
    (8, 1, 1, 'Note', '/notes', 'Notebook', 'Note', 1, 1, true, true),
    (7, 1, 1, 'Workspaces', '/workspaces', 'FolderKanban', 'Workspace', 1, 2, true, true),
    (3, 1, 1, 'Danh sách màn hình', '/menus', 'Menu', 'ListMenus', 2, 1, true, true),
    (4, 1, 1, 'Master Data', '/masterdata', 'Database', 'MasterData', 2, 2, true, true),
    (5, 1, 1, 'Nhóm quyền', '/roles', 'UserKey', 'RoleGroup', 2, 3, true, true),
    (6, 1, 1, 'Người dùng', '/users', 'Users', 'Users', 2, 4, true, true)
ON CONFLICT ("alias") DO NOTHING;

SELECT setval(pg_get_serial_sequence('menus', 'id'), COALESCE((SELECT MAX(id) FROM menus), 1), true);

-- ==========================================
-- 4. SEED BẢNG PERMISSIONS
-- ==========================================
-- action lấy từ value của master_data group ACTION, code = <ALIAS MENU>_<SUFFIX>
-- Quyền CRUD cho các màn đã có chức năng, màn cha chỉ có quyền Xem
INSERT INTO "permissions" ("created_by", "updated_by", "menu_id", "name", "action", "code")
SELECT 1, 1, m.id, md.name || ' - ' || m.name, md.value, upper(m.alias) || '_' || a.suffix
FROM "menus" m
CROSS JOIN (VALUES
    ('ACTION001', 'VIEW'),
    ('ACTION002', 'CREATE'),
    ('ACTION003', 'UPDATE'),
    ('ACTION004', 'DELETE')
) AS a(action, suffix)
JOIN "master_data" md ON md."group" = 'ACTION' AND md.value = a.action AND md.deleted_at IS NULL
WHERE m.alias IN ('ListMenus', 'MasterData', 'RoleGroup', 'Users', 'Workspace')
   OR (m.alias IN ('HomePage', 'System') AND a.suffix = 'VIEW')
ON CONFLICT ("code") DO NOTHING;

-- Quyền đặc thù
INSERT INTO "permissions" ("created_by", "updated_by", "menu_id", "name", "action", "code")
SELECT 1, 1, m.id, a.name, md.value, a.code
FROM (VALUES
    ('Workspace', 'Duyệt thành viên', 'ACTION006', 'WORKSPACE_APPROVE'),
    ('RoleGroup', 'Phân quyền', 'ACTION007', 'ROLEGROUP_ACCESS_CONTROL')
) AS a(alias, name, action, code)
JOIN "menus" m ON m.alias = a.alias
JOIN "master_data" md ON md."group" = 'ACTION' AND md.value = a.action AND md.deleted_at IS NULL
ON CONFLICT ("code") DO NOTHING;

-- ==========================================
-- 5. GÁN TOÀN BỘ QUYỀN CHO ROLE ROOT
-- ==========================================
INSERT INTO "role_permissions" ("created_by", "updated_by", "role_id", "permission_id")
SELECT 1, 1, r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'root'
  AND NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );