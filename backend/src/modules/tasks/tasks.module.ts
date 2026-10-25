import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, TaskAssigned, TaskStatus } from './entities/index.js';
import { TaskStatusService } from './services/task-status.service.js';
import { TaskAssignedService } from './services/task-assigned.service.js';
import { TaskActivityService } from './services/task-activity.service.js';
import { TaskActivity } from './entities/task-activity.entity.js';
import { TasksService } from './services/tasks.service.js';
import { TasksController } from './tasks.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskAssigned, TaskStatus, TaskActivity])],
  controllers: [TasksController],
  providers: [TaskStatusService, TaskAssignedService, TaskActivityService, TasksService],
  exports: [TaskStatusService, TaskActivityService],
})
export class TasksModule {}
