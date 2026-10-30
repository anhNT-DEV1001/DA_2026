import { MigrationInterface, QueryRunner } from "typeorm";

// Mỗi workspace một kênh chung, mỗi space một kênh dự án; tạo kênh cho workspace/space đã có trước module chat.
export class ChatChannelsBackfill1793548800000 implements MigrationInterface {
    name = 'ChatChannelsBackfill1793548800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_conversations_workspace_channel" ON "conversations" ("workspace_id") WHERE "type" = 'WORKSPACE' AND "deleted_at" IS NULL`);
        await queryRunner.query(`
            INSERT INTO "conversations" ("workspace_id", "type", "name", "created_by", "updated_by")
            SELECT w."id", 'WORKSPACE', 'Kênh chung', w."owner_id", w."owner_id"
            FROM "workspaces" w
            WHERE w."deleted_at" IS NULL
            ON CONFLICT ("workspace_id") WHERE "type" = 'WORKSPACE' AND "deleted_at" IS NULL DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "conversations" ("workspace_id", "space_id", "type", "created_by", "updated_by")
            SELECT s."workspace_id", s."id", 'SPACE', s."created_by", s."created_by"
            FROM "spaces" s
            JOIN "workspaces" w ON w."id" = s."workspace_id" AND w."deleted_at" IS NULL
            WHERE s."deleted_at" IS NULL
            ON CONFLICT ("space_id") WHERE "type" = 'SPACE' AND "deleted_at" IS NULL DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Giữ các kênh đã tạo: có thể đã có tin nhắn
        await queryRunner.query(`DROP INDEX "public"."UQ_conversations_workspace_channel"`);
    }

}
