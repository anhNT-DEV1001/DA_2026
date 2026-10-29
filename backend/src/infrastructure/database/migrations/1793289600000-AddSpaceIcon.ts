import { MigrationInterface, QueryRunner } from "typeorm";

// Thêm spaces.icon (tên icon Lucide, nullable) để hiển thị trên sidebar/bảng space.
export class AddSpaceIcon1793289600000 implements MigrationInterface {
    name = 'AddSpaceIcon1793289600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spaces" ADD "icon" character varying(100)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "icon"`);
    }

}
