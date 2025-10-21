import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

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
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_DATABASE = process.env.DB_DATABASE || 'freshtrak_private_test';
