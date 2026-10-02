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
  PermissionController,
  RoleController,
} from './controllers/index.js';
import {
  AuthorizeService,
  MasterDataService,
  MenuService,
  PermissionService,
  RolePermissionService,
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
  controllers: [
    RoleController,
    MenuController,
    MasterDataController,
    PermissionController,
  ],
  providers: [
    RoleService,
    MenuService,
    MasterDataService,
    AuthorizeService,
    PermissionGuard,
    JwtAccessGuard,
    PermissionService,
    RolePermissionService,
  ],
  exports: [
    RoleService,
    MenuService,
    MasterDataService,
    AuthorizeService,
    PermissionGuard,
    PermissionService,
    RolePermissionService,
  ],
})
export class AdminModule {}
