import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { migrate, truncateAll, getDataSource, ensureDatabases } from './helpers/db';

// Load .env.test if present. It never overrides variables already set in the shell.
const testEnvPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath });
}

// The e2e run builds the Nest app, whose ConfigModule loads `.env` for any variable that is
// still unset. A developer `.env` can point at RDS and enable PantryTrak / SendGrid / Twilio,
// so every value that could reach a real service is set here, before the app loads.
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT || '2525';
process.env.SMTP_FROM = process.env.SMTP_FROM || 'no-reply@example.com';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.USE_LOCAL_JWT = process.env.USE_LOCAL_JWT || '1';

// Private (default) connection
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_DATABASE = process.env.DB_DATABASE || 'freshtrak_private_test';

// Public connection: same local server as the private one unless set explicitly
process.env.DB_PUBLIC_HOST = process.env.DB_PUBLIC_HOST || process.env.DB_HOST;
process.env.DB_PUBLIC_PORT = process.env.DB_PUBLIC_PORT || process.env.DB_PORT;
process.env.DB_PUBLIC_USERNAME = process.env.DB_PUBLIC_USERNAME || process.env.DB_USERNAME;
process.env.DB_PUBLIC_PASSWORD = process.env.DB_PUBLIC_PASSWORD || process.env.DB_PASSWORD;
process.env.DB_PUBLIC_DATABASE = process.env.DB_PUBLIC_DATABASE || 'freshtrak_public_test';

// Both connections run `synchronize: true` in test, so refuse anything but a local MySQL.
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'host.docker.internal', 'mysql']);
for (const key of ['DB_HOST', 'DB_PUBLIC_HOST']) {
  const host = (process.env[key] || '').toLowerCase();
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `[e2e] Refusing to run: ${key}="${process.env[key]}" is not a local MySQL host. ` +
        `The e2e suite synchronizes and truncates tables. Allowed: ${[...LOCAL_HOSTS].join(', ')}.`,
    );
  }
}

// Integrations are always off in e2e, whatever `.env` says.
process.env.PANTRY_TRAK_ENABLED = 'false';
process.env.PANTRY_TRAK_API_URL = 'http://127.0.0.1:9/pantrytrak-disabled-in-e2e';
process.env.PANTRY_TRAK_TOKEN = '';
process.env.PANTRY_TRAK_SECRET = '';
process.env.SENDGRID_ENABLED = 'false';
process.env.SENDGRID_API_KEY = '';
process.env.TWILIO_ENABLED = 'false';
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';

// Schema: by default the Nest app builds it with TypeORM `synchronize` (NODE_ENV=test).
// USE_MIGRATIONS=1 also runs the migrations in dist/migrations; they expect the base tables
// to exist already, so only use it against a schema that synchronize has built.
process.env.USE_MIGRATIONS = process.env.USE_MIGRATIONS || '0';

// Increase default Jest timeout to accommodate container/database startup
jest.setTimeout(30000);

beforeAll(async () => {
  // Create the private, public and hardcoded `freshtrak_public` databases if missing.
  await ensureDatabases();
  await getDataSource();
  if (process.env.USE_MIGRATIONS === '1') {
    await migrate();
  }
});

afterEach(async () => {
  await truncateAll();
});

// Ensure database connections are closed so Jest can exit cleanly
afterAll(async () => {
  const source = await getDataSource();
  const anySource = source as any;
  if (anySource && anySource.isInitialized && typeof anySource.destroy === 'function') {
    await anySource.destroy();
  }
});
