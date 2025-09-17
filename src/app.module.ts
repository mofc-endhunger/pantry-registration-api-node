import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [User, UserDetail, Authentication, Identity, Credential, PasswordResetToken],
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
