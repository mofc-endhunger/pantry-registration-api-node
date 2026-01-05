import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest')
  async registerGuest() {
    return this.authService.registerGuest();
  }

  @Post('login')
  @ApiBearerAuth('JWT-auth')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiBearerAuth('JWT-auth')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('request-password-reset')
  @ApiBearerAuth('JWT-auth')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @ApiBearerAuth('JWT-auth')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('facebook')
  @ApiBearerAuth('JWT-auth')
  facebookAuth(@Body() dto: FacebookAuthDto) {
    return this.authService.facebookAuth(dto);
  }

  // Upgrade a guest session (identified by X-Guest-Token) into the currently authenticated Cognito user.
  // Requires a valid Cognito JWT and a valid guest token in headers.
  @Post('upgrade-guest')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  async upgradeGuest(@Req() req: Request, @Headers('x-guest-token') guestToken?: string) {
    const user = req.user as { userId?: string; id?: string; email?: string } | undefined;
    const cognitoSub = user?.userId ?? user?.id;
    if (!cognitoSub) {
      throw new BadRequestException('Missing authenticated user');
    }
    if (!guestToken) {
      throw new BadRequestException('Missing X-Guest-Token header');
    }
    return this.authService.upgradeGuest({ guestToken, cognitoSub, email: user?.email });
  }
}
