import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskActivities1792429200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "task_activities" (
      "id" SERIAL PRIMARY KEY,
      "task_id" integer NOT NULL,
      "actor_id" integer,
      "action" varchar(20) NOT NULL,
      "before" jsonb,
      "after" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_task_activities_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_task_activities_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_task_activities_task" ON "task_activities" ("task_id", "id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "task_activities"');
  }
}
