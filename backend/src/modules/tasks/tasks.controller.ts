import {
  Body,
  Controller,
  Delete,
  Get,
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
  CreateTaskDto,
  TaskListQuery,
  TaskPageQuery,
  UpdateTaskDto,
} from './dtos/task.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('Tasks')
@ApiCookieAuth('access-token-cookie')
@Controller('workspaces/:workspaceId/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('statuses')
  @HasPermission('WORKSPACE_VIEW')
  statuses(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.tasks.statuses(workspaceId, user.id!);
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
