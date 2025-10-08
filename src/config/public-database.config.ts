import { registerAs } from '@nestjs/config';

export default registerAs('publicDatabase', () => ({
  host: process.env.DB_PUBLIC_HOST,
  port: parseInt(process.env.DB_PUBLIC_PORT || '3306'),
  username: process.env.DB_PUBLIC_USERNAME,
  password: process.env.DB_PUBLIC_PASSWORD,
  database: process.env.DB_PUBLIC_DATABASE,
}));
