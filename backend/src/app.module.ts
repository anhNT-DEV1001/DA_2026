import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { QueueModule } from './infrastructure/queue/queue.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { JwtAccessGuard } from './modules/auth/guards/index.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: process.env.APP_KEY as string,
      appSecret: process.env.APP_SECRET as string,
      serviceId: process.env.APP_SERVICE_ID as string,
    }),

    DatabaseModule,
    QueueModule,
    AdminModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAccessGuard,
    },
  ],
})
export class AppModule {}
