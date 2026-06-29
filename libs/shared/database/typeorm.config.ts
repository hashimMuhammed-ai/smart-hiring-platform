import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * TypeORM DataSource used exclusively by the CLI (`typeorm migration:run`, etc.).
 * Import path is relative to the workspace root.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/smart_hiring',
  synchronize: false,
  logging: true,
  entities: ['libs/shared/database/src/lib/entities/**/*.ts'],
  migrations: ['libs/shared/database/migrations/**/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
