import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkspaceMemberService,
  WorkspacesService,
} from './services/index.js';
import { WorkspacesController } from './workspaces.controller.js';
import { Workspace, WorkspaceMember } from './entities/index.js';
import { WorkspaceGuard } from './guards/index.js';
import { Role, MasterData } from '../admin/entites/index.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationModule } from '../notifications/notification.module.js';
import { TasksModule } from '../tasks/tasks.module.js';

@Module({
  imports: [
    UsersModule,
    NotificationModule,
    TasksModule,
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, Role, MasterData]),
  ],
  providers: [WorkspacesService, WorkspaceMemberService, WorkspaceGuard],
  controllers: [WorkspacesController],
  exports: [WorkspacesService, WorkspaceMemberService, WorkspaceGuard],
})
export class WorkspacesModule {}
