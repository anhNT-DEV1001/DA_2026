import { MigrationInterface, QueryRunner } from "typeorm";

// Hiển thị menu Spaces (con của Workspace) trên sidebar, đảm bảo có quyền Xem/Thêm/Sửa/Xóa
export class SidebarSpacesMenu1793203200000 implements MigrationInterface {
    name = 'SidebarSpacesMenu1793203200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO "menus" ("created_by", "updated_by", "name", "route", "icon", "alias", "parent_id", "displayOrder", "isSideBarDisplay", "is_active")
            SELECT 1, 1, 'Spaces', NULL, 'LayoutList', 'Spaces', m.id, 0, true, true
            FROM "menus" m WHERE m.alias = 'Workspace'
            ON CONFLICT ("alias") DO UPDATE SET "isSideBarDisplay" = true, "icon" = 'LayoutList'`);

        // Bỏ qua action đã có quyền trên menu Spaces (code có thể khác, vd: SPACES_THEM_SPACES)
        await queryRunner.query(`INSERT INTO "permissions" ("created_by", "updated_by", "menu_id", "name", "action", "code")
            SELECT 1, 1, m.id, md.name || ' - ' || m.name, md.value, 'SPACES_' || a.suffix
            FROM "menus" m
            CROSS JOIN (VALUES
                ('ACTION001', 'VIEW'),
                ('ACTION002', 'CREATE'),
                ('ACTION003', 'UPDATE'),
                ('ACTION004', 'DELETE')
            ) AS a(action, suffix)
            JOIN "master_data" md ON md."group" = 'ACTION' AND md.value = a.action AND md.deleted_at IS NULL
            WHERE m.alias = 'Spaces'
              AND NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p.menu_id = m.id AND p.action = a.action)
            ON CONFLICT ("code") DO NOTHING`);

        await queryRunner.query(`INSERT INTO "role_permissions" ("created_by", "updated_by", "role_id", "permission_id")
            SELECT 1, 1, r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            JOIN "menus" m ON m.id = p.menu_id AND m.alias = 'Spaces'
            WHERE r.name = 'root'
              AND NOT EXISTS (
                  SELECT 1 FROM "role_permissions" rp
                  WHERE rp.role_id = r.id AND rp.permission_id = p.id
              )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "menus" SET "isSideBarDisplay" = false WHERE "alias" = 'Spaces'`);
    }

}
