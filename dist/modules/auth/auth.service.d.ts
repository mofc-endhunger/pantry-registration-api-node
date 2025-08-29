import { Credential } from '../../entities/credential.entity';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { MailerService } from './mailer.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly userRepository;
    private readonly resetTokenRepository;
    private readonly mailerService;
    private readonly jwtService;
    private readonly authenticationRepository;
    private readonly credentialRepository;
    constructor(userRepository: Repository<User>, resetTokenRepository: Repository<PasswordResetToken>, mailerService: MailerService, jwtService: JwtService, authenticationRepository: Repository<Authentication>, credentialRepository: Repository<Credential>);
    registerGuest(): Promise<{
        id: number;
        user_id: number;
        token: string;
        expires_at: Date;
        created_at: string | Date;
        updated_at: string | Date;
        jwt: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
    }>;
    register(registerDto: RegisterDto): Promise<User>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    facebookAuth(dto: any): Promise<{
        message: string;
        received: any;
    }>;
}
