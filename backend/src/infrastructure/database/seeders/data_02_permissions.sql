-- Run after migrations and data_01.sql. Safe to rerun.
-- This seeds the root ROLE; assigning it to an account is a separate step.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'root')
     OR (SELECT count(*) FROM menus WHERE alias IN
       ('HomePage', 'System', 'ListMenus', 'MasterData', 'RoleGroup', 'Users', 'Workspace')) <> 7 THEN
    RAISE EXCEPTION 'Run data_01.sql before seeding permissions';
  END IF;
END $$;

INSERT INTO master_data ("group", value, name, name_group, "displayOrder")
SELECT 'ACTION', a.value, a.name, 'Thao tác', a.sort_order
FROM (VALUES
  ('ACTION006', 'Duyệt', 6),
  ('ACTION007', 'Phân quyền', 7)
) AS a(value, name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM master_data m WHERE m."group" = 'ACTION' AND m.value = a.value
);

-- Only menus whose pages are implemented receive permissions here.
INSERT INTO permissions (menu_id, name, action, code)
SELECT m.id, a.name || ' - ' || m.name, a.action, upper(m.alias) || '_' || a.suffix
FROM menus m
CROSS JOIN (VALUES
  ('ACTION001', 'VIEW', 'Xem'),
  ('ACTION002', 'CREATE', 'Thêm'),
  ('ACTION003', 'UPDATE', 'Sửa'),
  ('ACTION004', 'DELETE', 'Xóa')
) AS a(action, suffix, name)
WHERE m.alias IN ('ListMenus', 'MasterData', 'RoleGroup', 'Users', 'Workspace')
   OR (m.alias IN ('HomePage', 'System') AND a.suffix = 'VIEW')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (menu_id, name, action, code)
SELECT m.id, a.name, a.action, a.code
FROM (VALUES
  ('Workspace', 'Duyệt thành viên', 'ACTION006', 'WORKSPACE_APPROVE'),
  ('RoleGroup', 'Phân quyền', 'ACTION007', 'ROLEGROUP_ACCESS_CONTROL')
) AS a(alias, name, action, code)
JOIN menus m ON m.alias = a.alias
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'root'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
