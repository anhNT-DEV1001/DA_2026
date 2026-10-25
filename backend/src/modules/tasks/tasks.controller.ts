import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, HasPermission } from '../../common/decorators/index.js';
import { UserResponse } from '../users/dtos/index.js';
import {
  AssignTaskDto,
  CreateTaskDto,
  CreateTaskStatusDto,
  TaskListQuery,
  TaskPageQuery,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dtos/task.dto.js';
import { TasksService } from './services/tasks.service.js';
import { TaskStatusService } from './services/task-status.service.js';
import { TaskAssignedService } from './services/task-assigned.service.js';

@ApiTags('Tasks')
@ApiCookieAuth('access-token-cookie')
@Controller('workspaces/:workspaceId/tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly taskStatuses: TaskStatusService,
    private readonly taskAssigned: TaskAssignedService,
  ) {}

  @Get('statuses')
  @HasPermission('WORKSPACE_VIEW')
  statuses(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Query('spaceId', ParseIntPipe) spaceId: number,
  ) {
    return this.taskStatuses.list(workspaceId, spaceId);
  }

  @Post('statuses')
  @HasPermission('WORKSPACE_CREATE')
  createStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: CreateTaskStatusDto,
  ) {
    return this.taskStatuses.create(workspaceId, user.id!, dto);
  }

  @Patch('statuses/:statusId')
  @HasPermission('WORKSPACE_UPDATE')
  updateStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('statusId', ParseIntPipe) statusId: number,
    @Query('spaceId', ParseIntPipe) spaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.taskStatuses.update(workspaceId, spaceId, statusId, user.id!, dto);
  }

  @Delete('statuses/:statusId')
  @HasPermission('WORKSPACE_DELETE')
  @HttpCode(200)
  removeStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('statusId', ParseIntPipe) statusId: number,
    @Query('spaceId', ParseIntPipe) spaceId: number,
  ) {
    return this.taskStatuses.remove(workspaceId, spaceId, statusId);
  }

  @Get()
  @HasPermission('WORKSPACE_VIEW')
  list(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: TaskListQuery,
  ) {
    return this.tasks.list(workspaceId, user.id!, query);
  }

  @Get('activities')
  @HasPermission('WORKSPACE_VIEW')
  workspaceActivities(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: TaskPageQuery,
  ) {
    return this.tasks.workspaceActivities(workspaceId, user.id!, query);
  }

  @Get(':taskId/activities')
  @HasPermission('WORKSPACE_VIEW')
  activities(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: TaskPageQuery,
  ) {
    return this.tasks.activities(workspaceId, taskId, user.id!, query);
  }

  @Get(':taskId/assignees')
  @HasPermission('WORKSPACE_VIEW')
  listAssignees(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.taskAssigned.listAssignees(workspaceId, taskId, user.id!);
  }

  @Post(':taskId/assignees')
  @HasPermission('WORKSPACE_UPDATE')
  assign(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: AssignTaskDto,
  ) {
    return this.taskAssigned.assign(workspaceId, taskId, user.id!, dto);
  }

  @Delete(':taskId/assignees/:userId')
  @HasPermission('WORKSPACE_UPDATE')
  @HttpCode(200)
  unassign(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.taskAssigned.unassign(workspaceId, taskId, userId, user.id!);
  }

  @Get(':taskId')
  @HasPermission('WORKSPACE_VIEW')
  detail(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.tasks.detail(workspaceId, taskId, user.id!);
  }

  @Post()
  @HasPermission('WORKSPACE_CREATE')
  create(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(workspaceId, user.id!, dto);
  }

  @Patch(':taskId')
  @HasPermission('WORKSPACE_UPDATE')
  update(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(workspaceId, taskId, user.id!, dto);
  }

  @Delete(':taskId')
  @HasPermission('WORKSPACE_DELETE')
  remove(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.tasks.remove(workspaceId, taskId, user.id!);
  }
}
