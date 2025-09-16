import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { User } from './entities/user.entity';
import { UserDetail } from './entities/user-detail.entity';
import { Authentication } from './entities/authentication.entity';
import { Identity } from './entities/identity.entity';
import { Credential } from './entities/credential.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Household } from './entities/household.entity';
import { HouseholdMember } from './entities/household-member.entity';
import { HouseholdMemberAudit } from './entities/household-member-audit.entity';
import { HouseholdsModule } from './modules/households/households.module';
import { GuestAuthenticationsModule } from './modules/guest-authentications/guest-authentications.module';
import { AuthCallbacksModule } from './modules/auth-callbacks/auth-callbacks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (process.env.NODE_ENV === 'test') {
          return {
            type: 'sqlite' as const,
            database: ':memory:',
            entities: [User, UserDetail, Authentication, Identity, Credential, PasswordResetToken, Household, HouseholdMember, HouseholdMemberAudit],
            synchronize: true,
            dropSchema: true,
            autoLoadEntities: true,
          };
        }
        return {
          type: 'mysql' as const,
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<string>('DB_PORT')),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [User, UserDetail, Authentication, Identity, Credential, PasswordResetToken, Household, HouseholdMember, HouseholdMemberAudit],
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),
  AuthModule,
  UsersModule,
  HouseholdsModule,
  GuestAuthenticationsModule,
  AuthCallbacksModule,
  ],
})
export class AppModule {}
