import { MigrationInterface, QueryRunner } from "typeorm";

// Chuyển tasks.priority từ low/medium/high/urgent sang master data nhóm PRIORITY
const toMasterData = `CASE %s
    WHEN 'low' THEN 'PRIORITY003'
    WHEN 'medium' THEN 'PRIORITY002'
    WHEN 'high' THEN 'PRIORITY001'
    WHEN 'urgent' THEN 'PRIORITY001'
    ELSE %s END`;
const toLegacy = `CASE %s
    WHEN 'PRIORITY003' THEN 'low'
    WHEN 'PRIORITY002' THEN 'medium'
    WHEN 'PRIORITY001' THEN 'high'
    ELSE 'medium' END`;

function mapSnapshots(mapping: string) {
    return ["before", "after"].map(
        (col) => `UPDATE "task_activities"
            SET "${col}" = jsonb_set("${col}", '{priority}', to_jsonb(${mapping.replaceAll("%s", `"${col}"->>'priority'`)}))
            WHERE "${col}" ? 'priority'`,
    );
}

export class TaskPriorityMasterData1793030400000 implements MigrationInterface {
    name = 'TaskPriorityMasterData1793030400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "CHK_tasks_priority"`);
        await queryRunner.query(`UPDATE "tasks" SET "priority" = ${toMasterData.replaceAll("%s", `"priority"`)}`);
        for (const sql of mapSnapshots(toMasterData)) await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "tasks" SET "priority" = ${toLegacy.replaceAll("%s", `"priority"`)}`);
        for (const sql of mapSnapshots(toLegacy)) await queryRunner.query(sql);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "CHK_tasks_priority" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'))`);
    }

}
