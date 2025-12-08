// CommonJS DataSource for e2e helpers. Uses compiled entities from dist/.
// Does not manage schema (synchronize/drop); the Nest app handles that in test.
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { DataSource } = require('typeorm');

const root = __dirname;

module.exports = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'freshtrak_private_test',
  entities: [path.join(root, 'dist', 'entities', '**', '*.js')],
  migrations: [path.join(root, 'dist', 'migrations', '*.js')],
  synchronize: false,
  dropSchema: false,
  logging: false,
});
