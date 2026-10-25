import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkspaceMemberService,
  WorkspacesService,
  SpaceService,
  SpaceMemberService,
} from './services/index.js';
import { WorkspacesController } from './workspaces.controller.js';
import { Workspace, WorkspaceMember, Space, SpaceMember } from './entities/index.js';
import { WorkspaceGuard, SpaceGuard } from './guards/index.js';
import { Role, MasterData } from '../admin/entites/index.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationModule } from '../notifications/notification.module.js';
import { TasksModule } from '../tasks/tasks.module.js';

@Module({
  imports: [
    UsersModule,
    NotificationModule,
    TasksModule,
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, Space, SpaceMember, Role, MasterData]),
  ],
  providers: [WorkspacesService, WorkspaceMemberService, SpaceService, SpaceMemberService, WorkspaceGuard, SpaceGuard],
  controllers: [WorkspacesController],
  exports: [WorkspacesService, WorkspaceMemberService, SpaceService, SpaceMemberService, WorkspaceGuard, SpaceGuard],
})
export class WorkspacesModule {}
