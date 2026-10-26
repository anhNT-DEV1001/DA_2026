import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNoteContentText1793018771369 implements MigrationInterface {
    name = 'AddNoteContentText1793018771369'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" ADD "content_text" text NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "content_text"`);
    }

}
