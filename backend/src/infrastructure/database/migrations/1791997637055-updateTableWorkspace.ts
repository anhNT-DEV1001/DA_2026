import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTableWorkspace1791997637055 implements MigrationInterface {
    name = 'UpdateTableWorkspace1791997637055'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "mode"`);
        await queryRunner.query(`DROP TYPE "public"."workspaces_mode_enum"`);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "mode" character varying(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "mode"`);
        await queryRunner.query(`CREATE TYPE "public"."workspaces_mode_enum" AS ENUM('public', 'private')`);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "mode" "public"."workspaces_mode_enum" NOT NULL DEFAULT 'private'`);
    }

}
