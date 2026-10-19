// Build first. PostgreSQL fixtures live in a temporary schema, rolled back even on failure.
// The test-only auth guard supplies fixture identities; production JWT is not bypassed.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { dataSourceOptions } from '../dist/config/typeorm.config.js';
import { CreateTaskFoundation1792425600000 } from '../dist/infrastructure/database/migrations/1792425600000-CreateTaskFoundation.js';
import { CreateTaskActivities1792429200000 } from '../dist/infrastructure/database/migrations/1792429200000-CreateTaskActivities.js';
import { TasksService } from '../dist/modules/tasks/tasks.service.js';
import { TasksController } from '../dist/modules/tasks/tasks.controller.js';
import { PermissionGuard } from '../dist/modules/admin/guards/permission.guard.js';
import { CustomValidationPipe } from '../dist/common/pipes/validation.pipe.js';

test('Task HTTP API with PostgreSQL transactions', async (t) => {
  const schema = `test_task_api_${randomUUID().replaceAll('-', '')}`;
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
  let app;
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    await runner.query(
      'CREATE TABLE users (id integer PRIMARY KEY, deleted_at timestamp)',
    );
    await runner.query(
      'CREATE TABLE workspaces (id integer PRIMARY KEY, owner_id integer, deleted_at timestamp)',
    );
    await runner.query(
      'CREATE TABLE workspace_members (id serial PRIMARY KEY, workspace_id integer, user_id integer, status varchar(255))',
    );
    await runner.query(
      'INSERT INTO users VALUES (1,NULL),(2,NULL),(3,NULL),(4,NULL),(5,NULL),(6,now())',
    );
    await runner.query(
      'INSERT INTO workspaces VALUES (1,1,NULL),(2,3,NULL),(3,1,now())',
    );
    await runner.query(
      "INSERT INTO workspace_members (workspace_id,user_id,status) VALUES (1,2,'MS001'),(1,4,'MS002'),(1,5,'active'),(1,6,'MS001')",
    );
    await new CreateTaskFoundation1792425600000().up(runner);
    const migration = new CreateTaskActivities1792429200000();
    await migration.up(runner);
    const service = new TasksService({
      manager: runner.manager,
      getRepository: (entity) => runner.manager.getRepository(entity),
      transaction: (fn) => runner.manager.transaction(fn),
    });
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalGuards(
      {
        canActivate(context) {
          const req = context.switchToHttp().getRequest();
          const id = Number(req.headers['x-test-user']);
          if (!id) throw new UnauthorizedException();
          req.user = {
            user: { id },
            permissions: (req.headers['x-test-permissions'] === 'none'
              ? []
              : [
                  'WORKSPACE_VIEW',
                  'WORKSPACE_CREATE',
                  'WORKSPACE_UPDATE',
                  'WORKSPACE_DELETE',
                ]
            ).map((code) => ({ code })),
          };
          return true;
        },
      },
      new PermissionGuard(new Reflector()),
    );
    app.useGlobalPipes(new CustomValidationPipe());
    await app.init();
    const http = request(app.getHttpServer());
    const base = '/workspaces/1/tasks';
    const get = (url, user = 1) =>
      http.get(url).set('x-test-user', String(user));
    const post = (body, user = 1) =>
      http.post(base).set('x-test-user', String(user)).send(body);
    const patch = (id, body, user = 1) =>
      http.patch(`${base}/${id}`).set('x-test-user', String(user)).send(body);
    const remove = (id, user = 1) =>
      http.delete(`${base}/${id}`).set('x-test-user', String(user));
    const statuses = (await get(`${base}/statuses`).expect(200)).body;
    const todo = statuses.find((s) => s.code === 'todo');
    const done = statuses.find((s) => s.code === 'done');
    let task;

    await t.test(
      'authentication, functional permission and workspace membership are required',
      async () => {
        await http.get(base).expect(401);
        await get(base).set('x-test-permissions', 'none').expect(403);
        for (const user of [3, 4]) {
          await get(base, user).expect(403);
          await get(`${base}/statuses`, user).expect(403);
          await post({ title: 'Denied' }, user).expect(403);
        }
        await get(base, 2).expect(200);
        await get(base, 5).expect(200);
        await get('/workspaces/3/tasks').expect(404);
        await get('/workspaces/0/tasks').expect(400);
      },
    );

    await t.test(
      'creates one assigned, scheduled task and an audit snapshot without user data',
      async () => {
        task = (
          await post({
            title: '  Thiết kế API  ',
            assigneeId: 2,
            startDate: '2026-10-20',
            dueDate: '2026-10-22',
          }).expect(201)
        ).body;
        assert.equal(task.title, 'Thiết kế API');
        assert.equal(task.statusId, todo.id);
        assert.equal(task.priority, 'medium');
        assert.equal(task.completedAt, null);
        assert.equal(task.createdBy, 1);
        const detail = (await get(`${base}/${task.id}`, 2).expect(200)).body;
        assert.equal(detail.assigneeId, 2);
        assert.equal(detail.assignee, undefined);
        assert.equal(detail.password, undefined);
        const history = (await get(`${base}/${task.id}/activities`).expect(200))
          .body;
        assert.equal(history.meta.itemCount, 1);
        assert.equal(history.items[0].action, 'created');
        assert.equal(history.items[0].after.title, task.title);
      },
    );

    await t.test(
      'rejects invalid payloads, forbidden fields, impossible dates and null required fields',
      async () => {
        for (const body of [
          {},
          { title: '  ' },
          { title: null },
          { title: 'x', statusId: null },
          { title: 'x', priority: null },
          { title: 'x', assigneeId: '2' },
          { title: 'x', workspaceId: 2 },
          { title: 'x', createdBy: 2 },
          { title: 'x', completedAt: new Date().toISOString() },
          { title: 'x', startDate: '2026-02-30' },
          { title: 'x', startDate: '2026-10-20T00:00:00Z' },
          { title: 'x', startDate: '2026-10-23', dueDate: '2026-10-22' },
        ])
          await post(body).expect(400);
        for (const body of [
          { title: null },
          { statusId: null },
          { priority: null },
          { dueDate: '2026-10-19' },
          { title: '' },
        ])
          await patch(task.id, body).expect(400);
        for (const query of [
          'limit=101',
          'page=0',
          'statusId=abc',
          'priority=unknown',
        ])
          await get(`${base}?${query}`).expect(400);
      },
    );

    await t.test(
      'rejects outsider, pending, deleted and nonexistent assignees and cross-workspace status',
      async () => {
        for (const assigneeId of [3, 4, 6, 999]) {
          await post({ title: 'Bad assignment', assigneeId }).expect(400);
          await patch(task.id, { assigneeId }).expect(400);
        }
        const other = (await get('/workspaces/2/tasks/statuses', 3).expect(200))
          .body[0];
        await patch(task.id, { statusId: other.id }).expect(400);
        await post({ title: 'Bad status', statusId: other.id }).expect(400);
      },
    );

    await t.test(
      'denies reads and mutations outside task workspace even with action permission',
      async () => {
        for (const user of [3, 4]) {
          await get(`${base}/${task.id}`, user).expect(403);
          await get(`${base}/${task.id}/activities`, user).expect(403);
          await patch(task.id, { title: 'Denied' }, user).expect(403);
          await remove(task.id, user).expect(403);
        }
        await get(`/workspaces/2/tasks/${task.id}`, 3).expect(404);
        await get(`/workspaces/2/tasks/${task.id}/activities`, 3).expect(404);
        await http
          .patch(`/workspaces/2/tasks/${task.id}`)
          .set('x-test-user', '3')
          .send({ title: 'Denied' })
          .expect(404);
        await http
          .delete(`/workspaces/2/tasks/${task.id}`)
          .set('x-test-user', '3')
          .expect(404);
        await patch(task.id, { title: 'Denied' })
          .set('x-test-permissions', 'none')
          .expect(403);
        await remove(task.id).set('x-test-permissions', 'none').expect(403);
      },
    );

    await t.test(
      'completes, preserves completion time, reopens and clears nullable fields',
      async () => {
        const completed = (
          await patch(task.id, { statusId: done.id }, 2).expect(200)
        ).body;
        assert.ok(completed.completedAt);
        const edited = (
          await patch(task.id, { title: 'API hoàn thành' }, 2).expect(200)
        ).body;
        assert.equal(edited.completedAt, completed.completedAt);
        const reopened = (
          await patch(
            task.id,
            {
              statusId: todo.id,
              assigneeId: null,
              startDate: null,
              dueDate: null,
              description: null,
            },
            2,
          ).expect(200)
        ).body;
        for (const key of [
          'completedAt',
          'assigneeId',
          'startDate',
          'dueDate',
          'description',
        ])
          assert.equal(reopened[key], null);
        const history = (await get(`${base}/${task.id}/activities`).expect(200))
          .body;
        assert.equal(history.meta.itemCount, 4);
        assert.equal(history.items[0].actorId, 2);
        await patch(task.id, {}).expect(200);
        assert.equal(
          (await get(`${base}/${task.id}/activities`).expect(200)).body.meta
            .itemCount,
          4,
        );
      },
    );

    await t.test(
      'supports defaults, active legacy members, filters and pagination',
      async () => {
        await post(
          { title: 'Bản nháp', priority: 'urgent', assigneeId: 1 },
          5,
        ).expect(201);
        const filtered = (
          await get(
            `${base}?search=B%E1%BA%A3n&priority=urgent&assigneeId=1&statusId=${todo.id}`,
          ).expect(200)
        ).body;
        assert.equal(filtered.meta.itemCount, 1);
        assert.equal(filtered.items[0].title, 'Bản nháp');
        const page = (await get(`${base}?limit=1`).expect(200)).body;
        assert.equal(page.items.length, 1);
        assert.equal(page.meta.pageCount, 2);
        assert.equal(page.meta.hasNextPage, true);
      },
    );

    await t.test(
      'rolls back create/update/delete when audit persistence fails',
      async () => {
        await runner.query(
          `CREATE FUNCTION reject_test_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$`,
        );
        await runner.query(
          'CREATE TRIGGER reject_test_activity BEFORE INSERT ON task_activities FOR EACH ROW EXECUTE FUNCTION reject_test_activity()',
        );
        await post({ title: 'Must roll back' }).expect(500);
        await patch(task.id, { title: 'Must roll back' }).expect(500);
        await remove(task.id).expect(500);
        assert.equal(
          (await get(`${base}/${task.id}`).expect(200)).body.title,
          'API hoàn thành',
        );
        assert.equal((await get(base).expect(200)).body.meta.itemCount, 2);
        assert.equal(
          (await get(`${base}/${task.id}/activities`).expect(200)).body.meta
            .itemCount,
          4,
        );
        await runner.query(
          'DROP TRIGGER reject_test_activity ON task_activities',
        );
      },
    );

    await t.test(
      'soft delete hides task and preserves its history',
      async () => {
        await remove(task.id).expect(200);
        await get(`${base}/${task.id}`).expect(404);
        await patch(task.id, { title: 'Deleted' }).expect(404);
        await remove(task.id).expect(404);
        assert.equal((await get(base).expect(200)).body.meta.itemCount, 1);
        const history = (await get(`${base}/${task.id}/activities`).expect(200))
          .body;
        assert.equal(history.meta.itemCount, 5);
        assert.equal(history.items[0].action, 'deleted');
        assert.equal(history.items[0].after, null);
        const [row] = await runner.query(
          'SELECT deleted_by FROM tasks WHERE id=$1',
          [task.id],
        );
        assert.equal(row.deleted_by, 1);
      },
    );

    await t.test(
      'workspace activity includes deleted tasks but enforces workspace scope',
      async () => {
        const feed = (await get(`${base}/activities`).expect(200)).body;
        assert.equal(feed.meta.itemCount, 6);
        assert.equal(feed.items[0].action, 'deleted');
        assert.equal(feed.items[0].taskId, task.id);
        assert.equal(
          (await get('/workspaces/2/tasks/activities', 3).expect(200)).body.meta
            .itemCount,
          0,
        );
        await get(`${base}/activities`, 3).expect(403);
        await get(`${base}/activities`, 4).expect(403);
        await get(`${base}/activities`)
          .set('x-test-permissions', 'none')
          .expect(403);
        await get('/workspaces/3/tasks/activities').expect(404);
        assert.equal(
          (await get(`${base}/activities?limit=2&page=2`).expect(200)).body
            .items.length,
          2,
        );
      },
    );

    await t.test(
      'schedule overlap includes boundary and partial dates, excludes undated/deleted/other workspace',
      async () => {
        await runner.query('SAVEPOINT schedule_fixtures');
        try {
          await post({
            title: 'Spanning',
            startDate: '2026-09-30',
            dueDate: '2026-11-01',
          }).expect(201);
          await post({ title: 'Start only', startDate: '2026-10-01' }).expect(
            201,
          );
          await post({ title: 'Due only', dueDate: '2026-10-31' }).expect(201);
          await post({
            title: 'Outside',
            startDate: '2026-11-01',
            dueDate: '2026-11-02',
          }).expect(201);
          await http
            .post('/workspaces/2/tasks')
            .set('x-test-user', '3')
            .send({ title: 'Other workspace', startDate: '2026-10-10' })
            .expect(201);
          const schedule = (
            await get(`${base}?from=2026-10-01&to=2026-10-31`).expect(200)
          ).body;
          assert.deepEqual(schedule.items.map((row) => row.title).sort(), [
            'Due only',
            'Spanning',
            'Start only',
          ]);
          const paged = (
            await get(`${base}?from=2026-10-01&to=2026-10-31&limit=1`).expect(
              200,
            )
          ).body;
          assert.equal(paged.meta.itemCount, 3);
          assert.equal(paged.items.length, 1);
          for (const range of [
            'from=2026-10-01',
            'from=2026-10-31&to=2026-10-01',
            'from=2026-02-30&to=2026-03-01',
            'from=2026-01-01&to=2028-01-01',
          ])
            await get(`${base}?${range}`).expect(400);
        } finally {
          await runner.query('ROLLBACK TO SAVEPOINT schedule_fixtures');
          await runner.query('RELEASE SAVEPOINT schedule_fixtures');
        }
      },
    );

    await t.test('activity migration down preserves task data', async () => {
      await migration.down(runner);
      const [row] = await runner.query(
        "SELECT to_regclass('task_activities') AS activities, count(*) AS tasks FROM tasks",
      );
      assert.equal(row.activities, null);
      assert.equal(Number(row.tasks), 2);
    });
  } finally {
    if (app) await app.close();
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
});
