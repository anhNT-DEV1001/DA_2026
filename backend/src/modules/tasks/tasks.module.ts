import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, TaskStatus } from './entities/index.js';
import { TaskStatusService } from './task-status.service.js';
import { TaskActivity } from './entities/task-activity.entity.js';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskStatus, TaskActivity])],
  controllers: [TasksController],
  providers: [TaskStatusService, TasksService],
  exports: [TaskStatusService],
})
export class TasksModule {}
