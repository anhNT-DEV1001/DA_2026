import { Module } from '@nestjs/common';
import { WorkspaceAccessService } from './services/workspace-access.service.js';

/** Tách riêng khỏi WorkspacesModule để TasksModule dùng được mà không import vòng */
@Module({
  providers: [WorkspaceAccessService],
  exports: [WorkspaceAccessService],
})
export class WorkspaceAccessModule {}
