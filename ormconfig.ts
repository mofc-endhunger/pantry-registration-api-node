import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';
import { UserDetail } from './src/entities/user-detail.entity';
import { Authentication } from './src/entities/authentication.entity';
import { Identity } from './src/entities/identity.entity';
import { Credential } from './src/entities/credential.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'pantry_registration',
  entities: [User, UserDetail, Authentication, Identity, Credential],
  synchronize: false, // Use migrations in production
  migrations: ['src/migrations/*.ts'],
});
