import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { UserSession } from './entities/index.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAccessStrategy, JwtRefreshStrategy } from './strategies/index.js';
import { JwtAccessGuard } from './guards/index.js';
import { Role } from '../admin/entites/index.js';
import { AdminModule } from '../admin/admin.module.js';

@Module({
  imports: [
    UsersModule,
    AdminModule,
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    TypeOrmModule.forFeature([UserSession, Role]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAccessGuard,
  ],
  exports: [AuthService, PassportModule, JwtAccessGuard],
})
export class AuthModule {}
