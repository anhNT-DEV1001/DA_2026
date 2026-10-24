import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSpace1792861266944 implements MigrationInterface {
    name = 'CreateSpace1792861266944'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "spaces" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" integer, "name" character varying(255) NOT NULL, "workspace_id" integer NOT NULL, "description" text, "display_order" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_dbe542974aca57afcb60709d4c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_workspace_assignee" ON "tasks"  ("workspace_id", "assignee_id") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_workspace_status" ON "tasks"  ("workspace_id", "status_id") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_workspace_schedule" ON "tasks"  ("workspace_id", "start_date", "due_date") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "spaces" ADD CONSTRAINT "FK_727822d37f8354dbf168038744c" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT "FK_727822d37f8354dbf168038744c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_workspace_schedule"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_workspace_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_workspace_assignee"`);
        await queryRunner.query(`DROP TABLE "spaces"`);
    }

}
