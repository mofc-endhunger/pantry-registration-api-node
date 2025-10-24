require('dotenv').config();
const path = require('path');
const { DataSource } = require('typeorm');

module.exports = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, 'dist', 'entities', '*.js')],
  migrations: [path.join(__dirname, 'dist', 'migrations', '*.js')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
