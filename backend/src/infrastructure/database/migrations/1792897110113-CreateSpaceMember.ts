import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSpaceMember1792897110113 implements MigrationInterface {
    name = 'CreateSpaceMember1792897110113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "space-members" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "space_id" integer NOT NULL, "workspace_member_id" integer NOT NULL, CONSTRAINT "PK_57f5633437461609c5265d6214d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "space-members" ADD CONSTRAINT "FK_9c126c9a3d127e680c1f78cd9af" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "space-members" ADD CONSTRAINT "FK_8675463dfbc9c93b93d1d8cf7a4" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "space-members" DROP CONSTRAINT "FK_8675463dfbc9c93b93d1d8cf7a4"`);
        await queryRunner.query(`ALTER TABLE "space-members" DROP CONSTRAINT "FK_9c126c9a3d127e680c1f78cd9af"`);
        await queryRunner.query(`DROP TABLE "space-members"`);
    }

}
