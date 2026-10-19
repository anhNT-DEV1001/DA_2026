import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskFoundation1792425600000 implements MigrationInterface {
  name = 'CreateTaskFoundation1792425600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_statuses" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        "created_by" integer,
        "updated_by" integer,
        "workspace_id" integer NOT NULL,
        "code" varchar(50) NOT NULL,
        "name" varchar(100) NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_completed" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_task_statuses_workspace_code" UNIQUE ("workspace_id", "code"),
        CONSTRAINT "UQ_task_statuses_workspace_id" UNIQUE ("workspace_id", "id"),
        CONSTRAINT "CHK_task_statuses_name" CHECK (length(btrim("name")) > 0),
        CONSTRAINT "CHK_task_statuses_order" CHECK ("display_order" >= 0),
        CONSTRAINT "FK_task_statuses_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        "created_by" integer,
        "updated_by" integer,
        "deleted_at" TIMESTAMP,
        "deleted_by" integer,
        "workspace_id" integer NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "status_id" integer NOT NULL,
        "assignee_id" integer,
        "priority" varchar(10) NOT NULL DEFAULT 'medium',
        "start_date" date,
        "due_date" date,
        "completed_at" timestamptz,
        CONSTRAINT "CHK_tasks_title" CHECK (length(btrim("title")) > 0),
        CONSTRAINT "CHK_tasks_priority" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
        CONSTRAINT "CHK_tasks_dates" CHECK ("start_date" IS NULL OR "due_date" IS NULL OR "start_date" <= "due_date"),
        CONSTRAINT "FK_tasks_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_workspace_status" FOREIGN KEY ("workspace_id", "status_id")
          REFERENCES "task_statuses"("workspace_id", "id") ON DELETE NO ACTION,
        CONSTRAINT "FK_tasks_assignee" FOREIGN KEY ("assignee_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_workspace_schedule" ON "tasks" ("workspace_id", "start_date", "due_date") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_workspace_status" ON "tasks" ("workspace_id", "status_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_workspace_assignee" ON "tasks" ("workspace_id", "assignee_id") WHERE "deleted_at" IS NULL`,
    );

    // Keep historical migrations self-contained; do not import mutable app defaults.
    await queryRunner.query(`
      INSERT INTO "task_statuses" ("workspace_id", "code", "name", "display_order", "is_completed")
      SELECT w.id, s.code, s.name, s.display_order, s.is_completed
      FROM "workspaces" w
      CROSS JOIN (VALUES
        ('todo', 'Chưa bắt đầu', 0, false),
        ('in_progress', 'Đang thực hiện', 1, false),
        ('in_review', 'Chờ kiểm tra', 2, false),
        ('done', 'Hoàn thành', 3, true)
      ) AS s(code, name, display_order, is_completed)
      WHERE w.deleted_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tasks"');
    await queryRunner.query('DROP TABLE "task_statuses"');
  }
}
