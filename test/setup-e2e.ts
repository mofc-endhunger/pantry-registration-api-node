import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { migrate, truncateAll } from './helpers/db';

// Load .env.test if present
const testEnvPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath });
}

// Sensible defaults to avoid external SMTP and provide DB defaults in CI/local
process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT || '2525';
process.env.SMTP_FROM = process.env.SMTP_FROM || 'no-reply@example.com';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_DATABASE = process.env.DB_DATABASE || 'freshtrak_private_test';
process.env.USE_LOCAL_JWT = process.env.USE_LOCAL_JWT || '1';

// Increase default Jest timeout to accommodate container/database startup
jest.setTimeout(30000);

// Ensure schema readiness: by default rely on TypeORM synchronize in test env.
// If you need migrations instead, set USE_MIGRATIONS=1.
beforeAll(async () => {
  if (process.env.USE_MIGRATIONS === '1') {
    await migrate();
  }
});

afterEach(async () => {
  await truncateAll();
});
