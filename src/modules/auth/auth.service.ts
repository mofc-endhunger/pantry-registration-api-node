import { Credential } from '../../entities/credential.entity';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Optional,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { MailerService } from './mailer.service';
import { TwilioService } from '../../modules/notifications/twilio.service';
import { JwtService } from '@nestjs/jwt';
import { SafeRandom } from '../../common/utils/safe-random';
import { HouseholdsService } from '../households/households.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
    @InjectRepository(Authentication)
    private readonly authenticationRepository: Repository<Authentication>,
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
    @Optional() private readonly householdsService?: HouseholdsService,
    @Optional() private readonly twilioService?: TwilioService,
  ) {}

  private async generateUniqueIdentificationCode(): Promise<string> {
    let code: string;
    do {
      code = SafeRandom.generateCode(6);
    } while (await this.userRepository.findOne({ where: { identification_code: code } }));
    return code;
  }

  async registerGuest() {
    // Create a new guest user
    const guestUser = this.userRepository.create({
      user_type: 'guest',
      identification_code: await this.generateUniqueIdentificationCode(),
    });
    await this.userRepository.save(guestUser);

    // Create authentication for the guest user
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours expiry
    const authentication = this.authenticationRepository.create({
      user_id: guestUser.id,
      token,
      expires_at,
      user: guestUser,
    });
    await this.authenticationRepository.save(authentication);

    return {
      id: authentication.id,
      user_id: guestUser.id,
      token: authentication.token,
      expires_at: authentication.expires_at,
      created_at: authentication.created_at,
      updated_at: authentication.updated_at,
      new_record: true,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email or identification_code
    const user = await this.userRepository.findOne({
      where: [{ email: loginDto.email }, { identification_code: loginDto.email }],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Find credential for user
    const credential = await this.credentialRepository.findOne({ where: { user_id: user.id } });
    if (!credential || !credential.secret) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Compare password with bcrypt
    const valid = await bcrypt.compare(loginDto.password, credential.secret);
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
      where: [{ email: registerDto.email }, { identification_code: registerDto.email }],
    });
    if (existing) {
      throw new BadRequestException('User already exists');
    }
    // Hash password with bcrypt for legacy compatibility
    const saltRounds = 12; // Default for bcrypt-ruby
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);
    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      identification_code: registerDto.email,
      user_type: registerDto.user_type || 'customer',
    });
    const savedUser = await this.userRepository.save(user);
    // Create credential
    const credential = this.credentialRepository.create({
      user_id: savedUser.id,
      secret: passwordHash,
    });
    await this.credentialRepository.save(credential);
    return savedUser;
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
    if (typeof user.email === 'string') {
      try {
        await this.mailerService.sendResetEmail(user.email, token);
      } catch (err) {
        // Log mail errors so they show up in CloudWatch while still
        // allowing the password reset flow to succeed in non-prod/test.
        // eslint-disable-next-line no-console
        console.warn('Failed to send password reset email', err);
      }
    }
    // Also send SMS if phone number exists
    if (user.phone) {
      try {
        const resetUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password'}?token=${token}`;
        const msg = `Reset your password: ${resetUrl}`;
        await this.twilioService?.sendSms(undefined, user.phone, msg);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to send password reset SMS', err);
      }
    }
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
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    // Update credential
    let credential = await this.credentialRepository.findOne({ where: { user_id: user.id } });
    if (!credential) {
      credential = this.credentialRepository.create({ user_id: user.id });
    }
    credential.secret = passwordHash;
    await this.credentialRepository.save(credential);
    await this.resetTokenRepository.delete({ id: resetToken.id });
    return { message: 'Password reset successful' };
  }

  facebookAuth(dto: unknown): { message: string; received: unknown } {
    // TODO: Implement Facebook token verification and user lookup/creation
    // dto: { userID, graphDomain, accessToken }
    return { message: 'Facebook auth not yet implemented', received: dto };
  }

  // Upgrade an existing guest (identified by guest token) into the currently authenticated Cognito user (JWT).
  // - Does NOT change users.id; it attaches cognito_uuid/email to the existing guest user and flips user_type to 'customer'.
  // - If another user is already linked to this cognito sub, abort with conflict.
  async upgradeGuest(opts: { guestToken: string; cognitoSub: string; email?: string }) {
    const { guestToken, cognitoSub, email } = opts;
    if (!guestToken || typeof guestToken !== 'string') {
      throw new BadRequestException('Missing or invalid guest token');
    }
    if (!cognitoSub || typeof cognitoSub !== 'string') {
      throw new BadRequestException('Missing or invalid authenticated user');
    }
    const auth = await this.authenticationRepository.findOne({ where: { token: guestToken } });
    if (!auth) {
      throw new BadRequestException('Guest token not found or already used');
    }
    if (auth.expires_at && auth.expires_at < new Date()) {
      throw new BadRequestException('Guest token expired');
    }
    const guestUser = await this.userRepository.findOne({ where: { id: auth.user_id } });
    if (!guestUser) {
      throw new BadRequestException('Guest user not found for token');
    }
    // Normalize Cognito sub into 16-byte buffer (UUID without dashes, hex)
    const normalized = String(cognitoSub).replace(/-/g, '');
    if (!/^[a-fA-F0-9]{32}$/.test(normalized)) {
      throw new BadRequestException('Invalid Cognito subject format');
    }
    const targetUuid = Buffer.from(normalized, 'hex');
    // If another user already linked to this cognito_uuid, do not merge silently
    const existingLinked = await this.userRepository.findOne({
      where: { cognito_uuid: targetUuid },
    });
    if (existingLinked && existingLinked.id !== guestUser.id) {
      throw new ConflictException('This sign-in is already linked to another account');
    }
    // Attach cognito to the guest user (upgrade in place)
    guestUser.cognito_uuid = targetUuid;
    guestUser.user_type = 'customer';
    if (email && !guestUser.email) {
      guestUser.email = email;
    }
    await this.userRepository.save(guestUser);

    // Ensure this user has a household; create a minimal one if missing
    let householdId = this.householdsService
      ? await this.householdsService.findHouseholdIdByUserId(guestUser.id)
      : undefined;
    let householdCreated = false;
    if (!householdId && this.householdsService) {
      try {
        await this.householdsService.createHousehold(guestUser.id, {
          primary_first_name: guestUser.first_name || 'Guest',
          primary_last_name: guestUser.last_name || 'User',
          primary_date_of_birth: (guestUser.date_of_birth as unknown as string) || '1900-01-01',
          primary_phone: guestUser.phone ?? undefined,
          primary_email: guestUser.email ?? undefined,
        } as any);
        householdId = await this.householdsService.findHouseholdIdByUserId(guestUser.id);
        householdCreated = !!householdId;
      } catch {
        // If creation fails, proceed; downstream flows still can create on demand
      }
    }

    // Invalidate the guest token (delete or expire it)
    try {
      await this.authenticationRepository.delete({ id: auth.id });
    } catch {
      try {
        const patch: Partial<Authentication> = { expires_at: new Date(0) };
        await this.authenticationRepository.update(auth.id, patch);
      } catch {
        // swallow
      }
    }
    return {
      upgraded: true,
      user_id: guestUser.id,
      household_id: householdId ?? null,
      household_created: householdCreated,
    };
  }
}
