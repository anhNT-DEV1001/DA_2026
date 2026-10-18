import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from '../../modules/auth/entities/index.js';
import { UsersModule } from '../../modules/users/users.module.js';
import { WebsocketGateway } from './gateways/index.js';
import { WebsocketService } from './websocket.service.js';
import { ChannelRegistry } from './registries/index.js';

@Global()
@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([UserSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [ChannelRegistry, WebsocketGateway, WebsocketService],
  exports: [WebsocketService, ChannelRegistry],
})
export class WebsocketModule {}
