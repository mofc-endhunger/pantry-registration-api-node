import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import databaseConfig from './config/database.config';
import { User } from './entities/user.entity';
import { UserDetail } from './entities/user-detail.entity';
import { Authentication } from './entities/authentication.entity';
import { Identity } from './entities/identity.entity';
import { Credential } from './entities/credential.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [User, UserDetail, Authentication, Identity, Credential, PasswordResetToken],
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
