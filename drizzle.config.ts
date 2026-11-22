import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const isSqlite = (process.env.DB_DIALECT ?? 'postgresql').toLowerCase() === 'sqlite';

export default isSqlite
  ? defineConfig({
      dialect: 'sqlite',
      schema: './src/db/schema/sqlite.ts',
      dbCredentials: {
        url: process.env.SQLITE_PATH ?? './radsuite.db',
      },
    })
  : defineConfig({
      dialect: 'postgresql',
      schema: './src/db/schema/pg.ts',
      dbCredentials: {
        url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5435/rad_suite',
      },
    });
