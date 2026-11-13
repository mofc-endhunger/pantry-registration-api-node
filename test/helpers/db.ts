/* eslint-disable @typescript-eslint/no-var-requires */
import type { DataSource } from 'typeorm';
import * as path from 'path';

let ds: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (ds && (ds as any).isInitialized) return ds;
  // data-source.js exports a DataSource instance configured for dist entities/migrations
  // Use require to avoid ESM interop headaches in ts-jest
  const root = process.cwd();
  const dataSourcePath = path.join(root, 'data-source.js');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const source: DataSource = require(dataSourcePath);
  if (!(source as any).isInitialized) {
    await (source as any).initialize();
  }
  ds = source;
  return ds;
}

/**
 * Create the databases the e2e app needs on the local MySQL server(s):
 * the private DB, the public DB, and `freshtrak_public`, which the public event
 * entities hardcode via `@Entity(..., { database: 'freshtrak_public' })`.
 */
export async function ensureDatabases(): Promise<void> {
  const mysql = require('mysql2/promise');
  const targets = [
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      dbs: [process.env.DB_DATABASE],
    },
    {
      host: process.env.DB_PUBLIC_HOST,
      port: Number(process.env.DB_PUBLIC_PORT),
      user: process.env.DB_PUBLIC_USERNAME,
      password: process.env.DB_PUBLIC_PASSWORD,
      dbs: [process.env.DB_PUBLIC_DATABASE, 'freshtrak_public'],
    },
  ];
  for (const t of targets) {
    const conn = await mysql.createConnection({
      host: t.host,
      port: t.port,
      user: t.user,
      password: t.password,
    });
    try {
      for (const db of t.dbs) {
        if (db) await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\``);
      }
    } finally {
      await conn.end();
    }
  }
}

export async function migrate(): Promise<void> {
  const source = await getDataSource();
  // Run pending migrations (no-op if up to date)
  await (source as any).runMigrations();
}

export async function truncateAll(): Promise<void> {
  const source = await getDataSource();
  const query = (sql: string) => (source as any).query(sql);
  // Truncate every table in the private test schema (except TypeORM's migrations table),
  // so rows from one spec or run (e.g. `identities`) never leak into the next.
  const rows: Array<{ name: string }> = await query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> 'migrations'`,
  );
  const tables = rows.map((r) => r.name);
  await query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of tables) {
    try {
      // Use TRUNCATE if table exists; ignore errors for missing tables
      await query(`TRUNCATE TABLE \`${t}\``);
    } catch {
      // ignore
    }
  }
  await query('SET FOREIGN_KEY_CHECKS=1');
}
