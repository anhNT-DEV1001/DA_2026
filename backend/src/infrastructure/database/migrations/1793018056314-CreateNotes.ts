import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotes1793018056314 implements MigrationInterface {
    name = 'CreateNotes1793018056314'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" integer, "user_id" integer NOT NULL, "content" text NOT NULL DEFAULT '', "color" character varying(20) NOT NULL DEFAULT 'yellow', CONSTRAINT "CHK_notes_color" CHECK ("color" IN ('yellow', 'pink', 'green', 'blue', 'purple', 'orange', 'gray')), CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notes_user" ON "notes"  ("user_id", "id") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_notes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_notes_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notes_user"`);
        await queryRunner.query(`DROP TABLE "notes"`);
    }

}
