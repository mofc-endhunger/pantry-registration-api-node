import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { User } from './entities/user.entity';
import { UserDetail } from './entities/user-detail.entity';
import { Authentication } from './entities/authentication.entity';
import { Identity } from './entities/identity.entity';
import { Credential } from './entities/credential.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'pantry_registration',
      entities: [User, UserDetail, Authentication, Identity, Credential, PasswordResetToken],
      synchronize: false,
      autoLoadEntities: true,
    }),
    AuthModule,
  ],
})
export class AppModule {}
