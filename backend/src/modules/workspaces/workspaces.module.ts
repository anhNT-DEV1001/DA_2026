import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspacesController } from './workspaces.controller.js';
import { Workspace, WorkspaceMember, Project } from './entities/index.js';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, WorkspaceMember, Project])],
  providers: [WorkspacesService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
