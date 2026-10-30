import { MigrationInterface, QueryRunner } from "typeorm";

// Quyền task/realtime giờ tính theo space-members; space tạo trước đây chưa tự thêm người tạo vào space.
export class BackfillSpaceCreatorMembers1793376000000 implements MigrationInterface {
    name = 'BackfillSpaceCreatorMembers1793376000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "space-members" ("space_id", "workspace_member_id", "created_by")
            SELECT s."id", wm."id", s."created_by"
            FROM "spaces" s
            JOIN "workspace_members" wm
              ON wm."workspace_id" = s."workspace_id" AND wm."user_id" = s."created_by"
            WHERE s."deleted_at" IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM "space-members" sm
                WHERE sm."space_id" = s."id" AND sm."workspace_member_id" = wm."id"
              )
        `);
    }

    public async down(): Promise<void> {
        // Không xoá: không phân biệt được dòng do migration thêm với dòng thêm tay
    }

}
