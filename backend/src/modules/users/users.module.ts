import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserPermission, UserRole } from './entities/index.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { Role } from '../admin/entites/index.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, UserPermission, Role])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
