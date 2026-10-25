import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorTask1792923575238 implements MigrationInterface {
    name = 'RefactorTask1792923575238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_statuses" DROP CONSTRAINT "FK_task_statuses_workspace"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_workspace_status"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_assignee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_workspace_assignee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_workspace_status"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" DROP CONSTRAINT "UQ_task_statuses_workspace_code"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" DROP CONSTRAINT "UQ_task_statuses_workspace_id"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" RENAME COLUMN "workspace_id" TO "space_id"`);
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "assignee_id" TO "space_id"`);
        await queryRunner.query(`CREATE TABLE "task_assigned" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "task_id" integer NOT NULL, "user_id" integer NOT NULL, "assigned_by" integer, CONSTRAINT "UQ_task_assigned_task_user" UNIQUE ("task_id", "user_id"), CONSTRAINT "PK_08e2e950cab03baf77a28c65226" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_assigned_user_id" ON "task_assigned"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_task_assigned_task_id" ON "task_assigned"  ("task_id") `);
        await queryRunner.query(`CREATE TABLE "task_comments" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" integer, "task_id" integer NOT NULL, "author_id" integer, "parent_id" integer, "content_type" character varying(255) NOT NULL DEFAULT 'markdown', "content" text NOT NULL, "edited_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_task_comments_content" CHECK (length(btrim("content")) > 0), CONSTRAINT "PK_83b99b0b03db29d4cafcb579b77" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_comments_parent" ON "task_comments"  ("parent_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_task_comments_task" ON "task_comments"  ("task_id", "id") `);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "CHK_tasks_priority"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "priority" character varying(255) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_space" ON "tasks"  ("space_id") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_space_status" ON "tasks"  ("space_id", "status_id") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "CHK_tasks_priority" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'))`);
        await queryRunner.query(`ALTER TABLE "task_statuses" ADD CONSTRAINT "UQ_task_statuses_space_id" UNIQUE ("space_id", "id")`);
        await queryRunner.query(`ALTER TABLE "task_statuses" ADD CONSTRAINT "UQ_task_statuses_space_code" UNIQUE ("space_id", "code")`);
        await queryRunner.query(`ALTER TABLE "task_statuses" ADD CONSTRAINT "FK_task_statuses_space" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_assigned" ADD CONSTRAINT "FK_task_assigned_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_assigned" ADD CONSTRAINT "FK_task_assigned_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_assigned" ADD CONSTRAINT "FK_task_assigned_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_space" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_space_status" FOREIGN KEY ("status_id", "space_id") REFERENCES "task_statuses"("id","space_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_parent" FOREIGN KEY ("parent_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_parent"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_author"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_task"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_space_status"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_space"`);
        await queryRunner.query(`ALTER TABLE "task_assigned" DROP CONSTRAINT "FK_task_assigned_assigned_by"`);
        await queryRunner.query(`ALTER TABLE "task_assigned" DROP CONSTRAINT "FK_task_assigned_user"`);
        await queryRunner.query(`ALTER TABLE "task_assigned" DROP CONSTRAINT "FK_task_assigned_task"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" DROP CONSTRAINT "FK_task_statuses_space"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" DROP CONSTRAINT "UQ_task_statuses_space_code"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" DROP CONSTRAINT "UQ_task_statuses_space_id"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "CHK_tasks_priority"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_space_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_space"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "priority" character varying(10) NOT NULL DEFAULT 'medium'`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "CHK_tasks_priority" CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_comments_task"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_comments_parent"`);
        await queryRunner.query(`DROP TABLE "task_comments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_assigned_task_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_assigned_user_id"`);
        await queryRunner.query(`DROP TABLE "task_assigned"`);
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "space_id" TO "assignee_id"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" RENAME COLUMN "space_id" TO "workspace_id"`);
        await queryRunner.query(`ALTER TABLE "task_statuses" ADD CONSTRAINT "UQ_task_statuses_workspace_id" UNIQUE ("id", "workspace_id")`);
        await queryRunner.query(`ALTER TABLE "task_statuses" ADD CONSTRAINT "UQ_task_statuses_workspace_code" UNIQUE ("workspace_id", "code")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_workspace_status" ON "tasks" USING btree ("status_id", "workspace_id") WHERE (deleted_at IS NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_workspace_assignee" ON "tasks" USING btree ("assignee_id", "workspace_id") WHERE (deleted_at IS NULL)`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_assignee" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_workspace_status" FOREIGN KEY ("workspace_id", "status_id") REFERENCES "task_statuses"("workspace_id","id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_statuses" ADD CONSTRAINT "FK_task_statuses_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
