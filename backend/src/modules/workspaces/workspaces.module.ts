import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkspaceMemberService,
  WorkspacesService,
} from './services/index.js';
import { WorkspacesController } from './workspaces.controller.js';
import { Workspace, WorkspaceMember } from './entities/index.js';
import { Role } from '../admin/entites/index.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, Role]),
  ],
  providers: [WorkspacesService, WorkspaceMemberService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService, WorkspaceMemberService],
})
export class WorkspacesModule {}
