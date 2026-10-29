import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, TaskAssigned, TaskComment, TaskStatus } from './entities/index.js';
import { TaskStatusService } from './services/task-status.service.js';
import { TaskAssignedService } from './services/task-assigned.service.js';
import { TaskActivityService } from './services/task-activity.service.js';
import { TaskActivity } from './entities/task-activity.entity.js';
import { TasksService } from './services/tasks.service.js';
import { TaskCommentService } from './services/task-comment.service.js';
import { TaskRealtimeService } from './services/task-realtime.service.js';
import { TasksController } from './tasks.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskAssigned, TaskStatus, TaskActivity, TaskComment])],
  controllers: [TasksController],
  providers: [TaskRealtimeService, TaskStatusService, TaskAssignedService, TaskActivityService, TasksService, TaskCommentService],
  exports: [TaskStatusService, TaskActivityService],
})
export class TasksModule {}
