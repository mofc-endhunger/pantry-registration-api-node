import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { jwtConstants } from './constants';
import { MailerService } from './mailer.service';
import { CognitoService } from './cognito.service';
import { CognitoController } from './cognito.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { Authentication } from '../../entities/authentication.entity';
import { Credential } from '../../entities/credential.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
    }),
  TypeOrmModule.forFeature([User, PasswordResetToken, Authentication, Credential]),
  ],
  controllers: [AuthController, CognitoController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, MailerService, CognitoService],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
