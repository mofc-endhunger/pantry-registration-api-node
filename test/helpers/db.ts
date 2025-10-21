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

export async function migrate(): Promise<void> {
  const source = await getDataSource();
  // Run pending migrations (no-op if up to date)
  await (source as any).runMigrations();
}

export async function truncateAll(): Promise<void> {
  const source = await getDataSource();
  const query = (sql: string) => (source as any).query(sql);
  await query('SET FOREIGN_KEY_CHECKS=0');
  const tables = [
    'registration_attendees',
    'registrations',
    'event_timeslots',
    'events',
    'checkin_audits',
    'password_reset_tokens',
    'credentials',
    'authentications',
    'household_addresses',
    'household_members',
    'households',
    'user_details',
    'users',
  ];
  for (const t of tables) {
    try {
      // Use TRUNCATE if table exists; ignore errors for missing tables
      await query(`TRUNCATE TABLE \`${t}\``);
    } catch (_) {
      // ignore
    }
  }
  await query('SET FOREIGN_KEY_CHECKS=1');
}
