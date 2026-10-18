import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateWorkspaceMember1792243603097 implements MigrationInterface {
    name = 'UpdateWorkspaceMember1792243603097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_cd3916b233236ce65c819f8c3f0"`);
        await queryRunner.query(`ALTER TABLE "workspace_members" ALTER COLUMN "role_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_cd3916b233236ce65c819f8c3f0" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_cd3916b233236ce65c819f8c3f0"`);
        await queryRunner.query(`ALTER TABLE "workspace_members" ALTER COLUMN "role_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_cd3916b233236ce65c819f8c3f0" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
