import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from '../../config/typeorm.config.js';

/**
 * Lệnh chạy database
 * genertate: bun run migration:generate src/infrastructure/database/migrations/CreateInitTables
 * migration: bun run migration:run
 * revert: bun run migration:revert
 * create: bun run migration:create src/infrastructure/database/migrations/CustomSQL
 * show: bun run migration:show
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...dataSourceOptions,
        autoLoadEntities: true, // Tiện ích của NestJS TypeORM
      }),
    }),
  ],
})
export class DatabaseModule {}
