import { Module } from '@nestjs/common';
//import { Reflector } from '@nestjs/core';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { jwtConstants } from './constants';
import { MailerService } from './mailer.service';
import { RolesGuard } from './roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { Authentication } from '../../entities/authentication.entity';
import { Credential } from '../../entities/credential.entity';
import { GuestOrJwtAuthGuard } from './guest-or-jwt.guard';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
    }),
    TypeOrmModule.forFeature([User, PasswordResetToken, Authentication, Credential]),
    NotificationsModule,
    HouseholdsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    GuestOrJwtAuthGuard,
    MailerService,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, GuestOrJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
