import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    registerGuest(): Promise<{
        id: number;
        user_id: number;
        token: string;
        expires_at: Date;
        created_at: Date;
        updated_at: Date;
        new_record: boolean;
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
    }>;
    register(registerDto: RegisterDto): Promise<import("../../entities").User>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    facebookAuth(dto: FacebookAuthDto): Promise<{
        message: string;
        received: any;
    }>;
}
