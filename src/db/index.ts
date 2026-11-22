import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { initSqliteTables } from './sqlite-init';

// 1. Global Date.prototype.toISOString safeguard (prevents crashes from invalid dates)
if (typeof Date !== 'undefined' && typeof Date.prototype.toISOString === 'function') {
  const origToISOString = Date.prototype.toISOString;
  Date.prototype.toISOString = function () {
    if (isNaN(this.getTime())) {
      return new Date().toISOString();
    }
    return origToISOString.call(this);
  };
}

// 2. Safeguard all schema timestamp/date columns against invalid Date, null, and string values
for (const table of Object.values(schema)) {
  if (table && typeof table === 'object') {
    for (const col of Object.values(table)) {
      const isDateCol =
        (col as any)?.dataType === 'date' ||
        String((col as any)?.columnType || '').includes('Timestamp') ||
        String((col as any)?.columnType || '').includes('Date');

      if (col && typeof col === 'object' && isDateCol && typeof (col as any).mapToDriverValue === 'function') {
        const orig = (col as any).mapToDriverValue;
        (col as any).mapToDriverValue = function (val: any) {
          if (val === null || val === undefined) {
            return (this as any).notNull ? new Date().toISOString() : null;
          }
          if (typeof val === 'string') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? ((this as any).notNull ? new Date().toISOString() : null) : d.toISOString();
          }
          if (val instanceof Date) {
            return isNaN(val.getTime()) ? ((this as any).notNull ? new Date().toISOString() : null) : orig.call(this, val);
          }
          return orig.call(this, val);
        };
      }
    }
  }
}

export const IS_SQLITE = (process.env.DB_DIALECT ?? 'sqlite').toLowerCase() === 'sqlite';

let db: NodePgDatabase<typeof schema>;
let pool: Pool | undefined;
let sqlite: any = null;

if (IS_SQLITE) {
  const sqlitePath = process.env.SQLITE_PATH ?? './radsuite.db';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzleSqlite } = require('drizzle-orm/better-sqlite3');

  const globalForDb = globalThis as typeof globalThis & { __radSuiteSqlite?: any };
  sqlite = globalForDb.__radSuiteSqlite ?? new Database(sqlitePath);
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__radSuiteSqlite = sqlite;
  }
  try {
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('cache_size = -64000');
    sqlite.pragma('temp_store = MEMORY');
    sqlite.pragma('mmap_size = 268435456');
    sqlite.pragma('foreign_keys = ON');
  } catch {}

  // Sanitize parameter types for better-sqlite3 (e.g. booleans -> 1/0, Dates -> ISO string)
  const sanitize = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString();
    if (Array.isArray(val)) return val.map(sanitize);
    if (typeof val === 'object' && val.constructor === Object) {
      const res: Record<string, any> = {};
      for (const k of Object.keys(val)) res[k] = sanitize(val[k]);
      return res;
    }
    return val;
  };

  const origPrepare = sqlite.prepare.bind(sqlite);
  sqlite.prepare = function (sql: string) {
    const stmt = origPrepare(sql);
    for (const m of ['run', 'all', 'get', 'iterate'] as const) {
      if (typeof stmt[m] === 'function') {
        const orig = stmt[m].bind(stmt);
        stmt[m] = function (...args: any[]) {
          return orig(...args.map(sanitize));
        };
      }
    }
    return stmt;
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    sqlite.function('gen_random_uuid', () => crypto.randomUUID());
    sqlite.function('now', () => new Date().toISOString());
  } catch {}

  initSqliteTables(sqlite);

  const sqliteDb = drizzleSqlite(sqlite, { schema });
  // Bridge async transaction support for better-sqlite3 WAL mode
  (sqliteDb as any).transaction = async function (callback: (tx: any) => Promise<any>) {
    if (sqlite.inTransaction) {
      return await callback(sqliteDb);
    }
    sqlite.exec('BEGIN IMMEDIATE;');
    try {
      const result = await callback(sqliteDb);
      sqlite.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        sqlite.exec('ROLLBACK;');
      } catch {}
      throw err;
    }
  };

  db = sqliteDb as unknown as NodePgDatabase<typeof schema>;
} else {
  const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5435/rad_suite';
  const globalForDb = globalThis as typeof globalThis & { __radSuitePgPool?: Pool };
  pool = globalForDb.__radSuitePgPool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__radSuitePgPool = pool;
  }
  db = drizzlePg(pool, { schema });
}

export { db, pool, sqlite };
