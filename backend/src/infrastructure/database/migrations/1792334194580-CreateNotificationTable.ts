import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationTable1792334194580 implements MigrationInterface {
    name = 'CreateNotificationTable1792334194580'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "created_by" integer, "updated_by" integer, "type" character varying(255) NOT NULL, "actor_id" integer, "workspace_id" integer, "entity_type" character varying(50), "entity_id" integer, "title" character varying(255) NOT NULL, "content" text, "data" jsonb, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d5ace4f24abe554acb1a919656" ON "notifications"  ("entity_type", "entity_id") `);
        await queryRunner.query(`CREATE TABLE "notification_recipients" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "created_by" integer, "updated_by" integer, "notification_id" integer NOT NULL, "user_id" integer NOT NULL, "read_at" TIMESTAMP, "seen_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "PK_bd5b25c456987261a38c762b223" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3b27329b3432f87ce8e3dc60b7" ON "notification_recipients"  ("user_id", "read_at", "id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dc5211d456f98a47de5e069f47" ON "notification_recipients"  ("notification_id", "user_id") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_ff8a9bf1b558104a843964c01ec" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_recipients" ADD CONSTRAINT "FK_021580b5aa0ee301ee359752b45" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_recipients" ADD CONSTRAINT "FK_3c1147687827d3dd27ebfb4a4af" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification_recipients" DROP CONSTRAINT "FK_3c1147687827d3dd27ebfb4a4af"`);
        await queryRunner.query(`ALTER TABLE "notification_recipients" DROP CONSTRAINT "FK_021580b5aa0ee301ee359752b45"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_ff8a9bf1b558104a843964c01ec"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc5211d456f98a47de5e069f47"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3b27329b3432f87ce8e3dc60b7"`);
        await queryRunner.query(`DROP TABLE "notification_recipients"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5ace4f24abe554acb1a919656"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}
