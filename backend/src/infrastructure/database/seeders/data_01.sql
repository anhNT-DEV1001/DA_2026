-- ==========================================
-- 1. SEED BẢNG MASTER_DATA
-- ==========================================
INSERT INTO "master_data" (
    "created_by", "updated_by", "group", "value", "name", "name_group", "description", "displayOrder"
) VALUES
    (1, 1, 'ACTION', 'ACTION001', 'Xem', 'Thao tác', 'Thao tác - Xem', 1),
    (1, 1, 'ACTION', 'ACTION002', 'Thêm', 'Thao tác', 'Thao tác - Thêm', 2),
    (1, 1, 'ACTION', 'ACTION003', 'Sửa', 'Thao tác', 'Thao tác - Sửa', 3),
    (1, 1, 'ACTION', 'ACTION004', 'Xóa', 'Thao tác', 'Thao tác - Xóa', 4),
    (1, 1, 'ACTION', 'ACTION005', 'Khóa', 'Thao tác', 'Thao tác - Khóa', 5),
    (1, 1, 'GENDER', 'GENDER001', 'Nam', 'Giới tính', 'Giới tính - Nam', 1),
    (1, 1, 'GENDER', 'GENDER002', 'Nữ', 'Giới tính', 'Giới tính - Nữ', 2),
    (1, 1, 'GENDER', 'GENDER003', 'Khác', 'Giới tính', 'Giới tính - Khác', 3),
    -- Bổ sung thêm group cho cột mode của bảng workspaces (sau khi đổi từ enum sang varchar)
    (1, 1, 'WSM', 'private', 'Riêng tư', 'Chế độ không gian làm việc', 'Chế độ - Riêng tư', 1),
    (1, 1, 'WSM', 'public', 'Công khai', 'Chế độ không gian làm việc', 'Chế độ - Công khai', 2);

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