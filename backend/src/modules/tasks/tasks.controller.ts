import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  HasPermission,
  SocketId,
} from '../../common/decorators/index.js';
import { UserResponse } from '../users/dtos/index.js';
import {
  AssignTaskDto,
  CreateTaskDto,
  CreateTaskStatusDto,
  MoveTaskDto,
  TaskActivityQuery,
  TaskListQuery,
  TaskPageQuery,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dtos/task.dto.js';
import {
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
} from './dtos/task-comment.dto.js';
import { TasksService } from './services/tasks.service.js';
import { TaskStatusService } from './services/task-status.service.js';
import { TaskAssignedService } from './services/task-assigned.service.js';
import { TaskCommentService } from './services/task-comment.service.js';
import { createMulterOptions } from '../../common/utils/multer.util.js';

const taskImageUploadOptions = createMulterOptions({
  folder: 'task-images',
  allowedTypes: ['image'],
});

@ApiTags('Tasks')
@ApiCookieAuth('access-token-cookie')
@Controller('workspaces/:workspaceId/tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly taskStatuses: TaskStatusService,
    private readonly taskAssigned: TaskAssignedService,
    private readonly taskComments: TaskCommentService,
  ) {}

  @Get('statuses')
  @HasPermission('WORKSPACE_VIEW')
  statuses(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Query('spaceId', new ParseIntPipe({ exceptionFactory: () => new BadRequestException('spaceId là bắt buộc và phải là số nguyên dương') })) spaceId: number,
  ) {
    return this.taskStatuses.list(workspaceId, spaceId);
  }

  @Post('statuses')
  @HasPermission('WORKSPACE_CREATE')
  createStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: CreateTaskStatusDto,
    @SocketId() origin?: string,
  ) {
    return this.taskStatuses.create(workspaceId, user.id!, dto, origin);
  }

  @Patch('statuses/:statusId')
  @HasPermission('WORKSPACE_UPDATE')
  updateStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('statusId', ParseIntPipe) statusId: number,
    @Query('spaceId', new ParseIntPipe({ exceptionFactory: () => new BadRequestException('spaceId là bắt buộc và phải là số nguyên dương') })) spaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateTaskStatusDto,
    @SocketId() origin?: string,
  ) {
    return this.taskStatuses.update(
      workspaceId,
      spaceId,
      statusId,
      user.id!,
      dto,
      origin,
    );
  }

  @Delete('statuses/:statusId')
  @HasPermission('WORKSPACE_DELETE')
  @HttpCode(200)
  removeStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('statusId', ParseIntPipe) statusId: number,
    @Query('spaceId', new ParseIntPipe({ exceptionFactory: () => new BadRequestException('spaceId là bắt buộc và phải là số nguyên dương') })) spaceId: number,
    @CurrentUser('user') user: UserResponse,
    @SocketId() origin?: string,
  ) {
    return this.taskStatuses.remove(
      workspaceId,
      spaceId,
      statusId,
      user.id!,
      origin,
    );
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
    @Query() query: TaskActivityQuery,
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
    @SocketId() origin?: string,
  ) {
    return this.taskAssigned.assign(workspaceId, taskId, user.id!, dto, origin);
  }

  @Delete(':taskId/assignees/:userId')
  @HasPermission('WORKSPACE_UPDATE')
  @HttpCode(200)
  unassign(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('user') user: UserResponse,
    @SocketId() origin?: string,
  ) {
    return this.taskAssigned.unassign(
      workspaceId,
      taskId,
      userId,
      user.id!,
      origin,
    );
  }

  @Get(':taskId/comments')
  @HasPermission('WORKSPACE_VIEW')
  listComments(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: TaskPageQuery,
  ) {
    return this.taskComments.list(workspaceId, taskId, user.id!, query);
  }

  @Post(':taskId/comments')
  @HasPermission('WORKSPACE_VIEW')
  createComment(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: CreateTaskCommentDto,
    @SocketId() origin?: string,
  ) {
    return this.taskComments.create(workspaceId, taskId, user.id!, dto, origin);
  }

  @Patch(':taskId/comments/:commentId')
  @HasPermission('WORKSPACE_VIEW')
  updateComment(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateTaskCommentDto,
    @SocketId() origin?: string,
  ) {
    return this.taskComments.update(
      workspaceId,
      taskId,
      commentId,
      user.id!,
      dto,
      origin,
    );
  }

  @Post(':taskId/images')
  @HasPermission('WORKSPACE_VIEW')
  @UseInterceptors(FileInterceptor('file', taskImageUploadOptions))
  uploadImage(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.taskComments.uploadImage(workspaceId, taskId, user.id!, file);
  }

  @Delete(':taskId/comments/:commentId')
  @HasPermission('WORKSPACE_VIEW')
  @HttpCode(200)
  removeComment(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser('user') user: UserResponse,
    @SocketId() origin?: string,
  ) {
    return this.taskComments.remove(
      workspaceId,
      taskId,
      commentId,
      user.id!,
      origin,
    );
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
    @SocketId() origin?: string,
  ) {
    return this.tasks.create(workspaceId, user.id!, dto, origin);
  }

  @Patch(':taskId')
  @HasPermission('WORKSPACE_UPDATE')
  update(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateTaskDto,
    @SocketId() origin?: string,
  ) {
    return this.tasks.update(workspaceId, taskId, user.id!, dto, origin);
  }

  @Patch(':taskId/move')
  @HasPermission('WORKSPACE_UPDATE')
  move(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: MoveTaskDto,
    @SocketId() origin?: string,
  ) {
    return this.tasks.move(workspaceId, taskId, user.id!, dto, origin);
  }

  @Delete(':taskId')
  @HasPermission('WORKSPACE_DELETE')
  @HttpCode(200)
  remove(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('user') user: UserResponse,
    @SocketId() origin?: string,
  ) {
    return this.tasks.remove(workspaceId, taskId, user.id!, origin);
  }
}
