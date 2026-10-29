import { MigrationInterface, QueryRunner } from "typeorm";

// Thêm tasks.position để sắp xếp task trong cột kanban.
// Dữ liệu cũ giữ thứ tự hiện tại (task mới nhất ở đầu cột).
export class TaskPosition1793116800000 implements MigrationInterface {
    name = 'TaskPosition1793116800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "position" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`UPDATE "tasks" t SET "position" = r.rn * 1024
            FROM (
                SELECT "id", ROW_NUMBER() OVER (PARTITION BY "space_id", "status_id" ORDER BY "id" DESC) AS rn
                FROM "tasks"
            ) r
            WHERE t."id" = r."id"`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_space_status_position" ON "tasks" ("space_id", "status_id", "position") WHERE "deleted_at" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_space_status_position"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "position"`);
    }

}
