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
        guestId: string;
        token: any;
        type: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
    }>;
    register(registerDto: RegisterDto): Promise<import("../../entities").User | {
        success: boolean;
        message: string;
    }>;
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
