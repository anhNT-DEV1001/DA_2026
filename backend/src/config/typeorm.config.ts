// src/config/typeorm.config.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenvConfig({ path: '.env' });

// Tái tạo __dirname trong ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../infrastructure/database/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

