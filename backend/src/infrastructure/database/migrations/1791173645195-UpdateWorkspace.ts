import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateWorkspace1791173645195 implements MigrationInterface {
    name = 'UpdateWorkspace1791173645195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "display_order" integer DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "is_star" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "is_star"`);
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "display_order"`);
    }

}
