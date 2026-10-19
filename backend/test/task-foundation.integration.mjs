// Run after `bun run build`: node --test test/task-foundation.integration.mjs
// Uses .env connection settings, but all fixtures and DDL live in a temporary
// schema inside one transaction that is always rolled back.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../dist/config/typeorm.config.js';
import { CreateTaskFoundation1792425600000 } from '../dist/infrastructure/database/migrations/1792425600000-CreateTaskFoundation.js';
import { Task } from '../dist/modules/tasks/entities/task.entity.js';
import { TaskStatus } from '../dist/modules/tasks/entities/task-status.entity.js';
import { TaskStatusService } from '../dist/modules/tasks/task-status.service.js';

test('Task foundation on PostgreSQL', async (t) => {
  const schema = `test_tasks_${randomUUID().replaceAll('-', '')}`;
  const source = new DataSource({
    ...dataSourceOptions,
    schema,
    logging: false,
    synchronize: false,
    migrationsRun: false,
    migrations: [],
  });
  await source.initialize();
  const runner = source.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    await runner.query('CREATE TABLE users (id integer PRIMARY KEY)');
    await runner.query('CREATE TABLE workspaces (id integer PRIMARY KEY, deleted_at timestamp)');
    await runner.query('INSERT INTO users VALUES (1), (2)');
    await runner.query("INSERT INTO workspaces VALUES (1, NULL), (2, now())");
    const migration = new CreateTaskFoundation1792425600000();
    await migration.up(runner);
    const statuses = runner.manager.getRepository(TaskStatus);
    const tasks = runner.manager.getRepository(Task);
    const service = new TaskStatusService();

    async function rejectsSql(sql, parameters, code, constraint) {
      await runner.query('SAVEPOINT invalid_input');
      try {
        await assert.rejects(runner.query(sql, parameters), (error) => {
          assert.equal(error.driverError.code, code);
          if (constraint) assert.equal(error.driverError.constraint, constraint);
          return true;
        });
      } finally {
        await runner.query('ROLLBACK TO SAVEPOINT invalid_input');
        await runner.query('RELEASE SAVEPOINT invalid_input');
      }
    }

    await t.test('backfills four ordered statuses for active workspaces only', async () => {
      const rows = await statuses.find({ order: { displayOrder: 'ASC' } });
      assert.deepEqual(rows.map((s) => [s.workspaceId, s.code, s.isCompleted]), [
        [1, 'todo', false], [1, 'in_progress', false],
        [1, 'in_review', false], [1, 'done', true],
      ]);
    });

    await t.test('new workspace defaults are idempotent and keep custom names', async () => {
      await runner.query('INSERT INTO workspaces VALUES (3, NULL)');
      await service.ensureDefaultStatuses(runner.manager, 3, 1);
      await statuses.update({ workspaceId: 3, code: 'todo' }, { name: 'Cần làm' });
      await service.ensureDefaultStatuses(runner.manager, 3, 1);
      assert.equal(await statuses.countBy({ workspaceId: 3 }), 4);
      const status = await statuses.findOneByOrFail({ workspaceId: 3, code: 'todo' });
      assert.equal(status.name, 'Cần làm');
      assert.equal(status.createdBy, 1);
      assert.deepEqual(
        (await statuses.find({ where: { workspaceId: 3 }, order: { displayOrder: 'ASC' } })).map((s) => s.code),
        ['todo', 'in_progress', 'in_review', 'done'],
      );
    });

    const todo = await statuses.findOneByOrFail({ workspaceId: 1, code: 'todo' });
    const otherTodo = await statuses.findOneByOrFail({ workspaceId: 3, code: 'todo' });
    let taskId;
    await t.test('ORM saves one assignee, date-only values and status relation', async () => {
      const saved = await tasks.save(tasks.create({
        workspaceId: 1, statusId: todo.id, title: 'Thiết kế API',
        assigneeId: 2, startDate: '2026-10-20', dueDate: '2026-10-22',
      }));
      taskId = saved.id;
      const task = await tasks.findOneOrFail({ where: { id: taskId }, relations: { status: true } });
      assert.equal(task.priority, 'medium');
      assert.equal(task.startDate, '2026-10-20');
      assert.equal(task.dueDate, '2026-10-22');
      assert.equal(task.assigneeId, 2);
      assert.equal(task.status.code, 'todo');
    });

    await t.test('allows unscheduled/unassigned and same-day tasks', async () => {
      const unscheduled = await tasks.save({ workspaceId: 1, statusId: todo.id, title: 'Chưa lên lịch' });
      const read = await tasks.findOneByOrFail({ id: unscheduled.id });
      assert.equal(read.startDate, null);
      assert.equal(read.dueDate, null);
      assert.equal(read.assigneeId, null);
      await tasks.save({ workspaceId: 1, statusId: todo.id, title: 'Một ngày', startDate: '2026-10-20', dueDate: '2026-10-20' });
    });

    await t.test('rejects invalid dates, blank title and unknown priority', async () => {
      await rejectsSql('UPDATE tasks SET start_date = $1, due_date = $2 WHERE id = $3',
        ['2026-10-23', '2026-10-22', taskId], '23514', 'CHK_tasks_dates');
      await rejectsSql('UPDATE tasks SET title = $1 WHERE id = $2', ['   ', taskId], '23514', 'CHK_tasks_title');
      await rejectsSql('UPDATE tasks SET priority = $1 WHERE id = $2', ['invalid', taskId], '23514', 'CHK_tasks_priority');
    });

    await t.test('rejects status from another workspace and unknown assignee', async () => {
      await rejectsSql('UPDATE tasks SET status_id = $1 WHERE id = $2',
        [otherTodo.id, taskId], '23503', 'FK_tasks_workspace_status');
      await rejectsSql('UPDATE tasks SET assignee_id = $1 WHERE id = $2',
        [999, taskId], '23503', 'FK_tasks_assignee');
      await rejectsSql('DELETE FROM task_statuses WHERE id = $1',
        [todo.id], '23503', 'FK_tasks_workspace_status');
    });

    await t.test('soft delete preserves task; deleting assignee clears assignment', async () => {
      await tasks.softDelete(taskId);
      assert.equal(await tasks.findOneBy({ id: taskId }), null);
      const archived = await tasks.findOneOrFail({ where: { id: taskId }, withDeleted: true });
      assert.ok(archived.deletedAt instanceof Date);
      await runner.query('DELETE FROM users WHERE id = 2');
      const [row] = await runner.query('SELECT assignee_id FROM tasks WHERE id = $1', [taskId]);
      assert.equal(row.assignee_id, null);
    });

    await t.test('workspace hard delete cascades tasks and statuses', async () => {
      await runner.query('DELETE FROM workspaces WHERE id = 1');
      assert.equal(await tasks.count({ where: { workspaceId: 1 }, withDeleted: true }), 0);
      assert.equal(await statuses.countBy({ workspaceId: 1 }), 0);
    });

    await t.test('migration down removes only the new tables', async () => {
      await migration.down(runner);
      const [row] = await runner.query("SELECT to_regclass('tasks') AS tasks, to_regclass('task_statuses') AS statuses, to_regclass('workspaces') AS workspaces");
      assert.equal(row.tasks, null);
      assert.equal(row.statuses, null);
      assert.ok(row.workspaces);
    });
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
});
