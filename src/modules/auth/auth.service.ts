import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { MailerService } from './mailer.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // Find user by email or identification_code
    const user = await this.userRepository.findOne({
      where: [
  { email: loginDto.email },
  { identification_code: loginDto.email },
      ],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Compare password with bcrypt
    const valid = await bcrypt.compare(loginDto.password, user.password_digest);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Issue JWT
  const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }

  async register(registerDto: RegisterDto) {
    // Check for duplicate email or identification_code
    const existing = await this.userRepository.findOne({
      where: [
  { email: registerDto.email },
  { identification_code: registerDto.email },
      ],
    });
    if (existing) {
      throw new BadRequestException('User already exists');
    }
    // Hash password with bcrypt for legacy compatibility
    const saltRounds = 12; // Default for bcrypt-ruby
    const password_digest = await bcrypt.hash(registerDto.password, saltRounds);
    // Create user
    const user = this.userRepository.create({
  email: registerDto.email,
  identification_code: registerDto.email,
      user_type: registerDto.user_type || 'customer',
      password_digest,
    });
    return this.userRepository.save(user);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
  const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If the email exists, a reset link will be sent.' };
    }
    // Generate token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiry
    await this.resetTokenRepository.save({ user_id: user.id, token, expires_at, user });
    // Send email with token
    await this.mailerService.sendResetEmail(user.email, token);
    return { message: 'If the email exists, a reset link will be sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.resetTokenRepository.findOne({ where: { token: dto.token } });
    if (!resetToken || resetToken.expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }
    const user = await this.userRepository.findOne({ where: { id: resetToken.user_id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Hash new password
    const saltRounds = 12;
    user.password_digest = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepository.save(user);
    await this.resetTokenRepository.delete({ id: resetToken.id });
    return { message: 'Password reset successful' };
  }
}
