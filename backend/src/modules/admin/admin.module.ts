import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MasterData,
  Menu,
  Permission,
  Role,
  RolePermission,
} from './entites/index.js';
import {
  MasterDataController,
  MenuController,
  RoleController,
} from './controllers/index.js';
import {
  AuthorizeService,
  MasterDataService,
  MenuService,
  RoleService,
} from './services/index.js';

import { UsersModule } from '../users/users.module.js';
import { PermissionGuard } from './guards/index.js';
import { JwtAccessGuard } from '../auth/guards/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Menu,
      MasterData,
      Permission,
      RolePermission,
    ]),
    UsersModule,
  ],
  controllers: [RoleController, MenuController, MasterDataController],
  providers: [
    RoleService,
    MenuService,
    MasterDataService,
    AuthorizeService,
    PermissionGuard,
    JwtAccessGuard,
  ],
  exports: [
    RoleService,
    MenuService,
    MasterDataService,
    AuthorizeService,
    PermissionGuard,
  ],
})
export class AdminModule {}
