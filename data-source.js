// Minimal TypeORM DataSource for e2e tests' DB utilities (truncate/migrate).
// Uses compiled entities from dist/ and does not perform schema sync or drop.
// The Nest application handles schema synchronization during tests.
const path = require('path');
const { DataSource } = require('typeorm');

const rootDir = __dirname;

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'freshtrak_private_test',
  entities: [path.join(rootDir, 'dist', 'entities', '*.entity.js')],
  migrations: [],
  synchronize: false, // let the app manage schema in test env
  logging: false,
});

module.exports = dataSource;

// Lightweight TypeORM DataSource for E2E tests and DB utilities
// Uses dist/ compiled entities and optional migrations
// Config is driven by environment variables set in test/setup-e2e.ts
// Export a DataSource instance (CommonJS) so tests can require it directly.

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { DataSource: TypeOrmDataSource } = require('typeorm');

const ROOT = __dirname;
const ENTITIES = [
  path.join(ROOT, 'dist', 'entities', '**', '*.js'),
  path.join(ROOT, 'dist', 'entities', '*.js'),
];
const MIGRATIONS = [path.join(ROOT, 'dist', 'migrations', '*.js')];

const useMigrations = process.env.USE_MIGRATIONS === '1';

const source = new TypeOrmDataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'freshtrak_private_test',
  entities: ENTITIES,
  migrations: MIGRATIONS,
  synchronize: useMigrations ? false : true,
  // Ensure a clean schema for each Jest environment to avoid "table exists" races
  dropSchema: useMigrations ? false : true,
  logging: false,
});

module.exports = source;

/* eslint-disable @typescript-eslint/no-var-requires */
// CommonJS file required by tests: exports a configured TypeORM DataSource
const { DataSource } = require('typeorm');

const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '3306', 10);
const username = process.env.DB_USERNAME || 'root';
const password = process.env.DB_PASSWORD || 'password';
const database = process.env.DB_DATABASE || 'freshtrak_private_test';

module.exports = new DataSource({
  type: 'mysql',
  host,
  port,
  username,
  password,
  database,
  // Use compiled entities and migrations from dist
  entities: ["dist/entities/**/*.js"],
  migrations: ["dist/migrations/**/*.js"],
  // For tests we allow synchronize to create schema when migrations are not used
  synchronize: process.env.USE_MIGRATIONS === '1' ? false : true,
  // In test mode, drop existing schema to avoid conflicts from leftover tables
  dropSchema: process.env.NODE_ENV === 'test',
  // Keep logging off in CI by default
  logging: false,
});
