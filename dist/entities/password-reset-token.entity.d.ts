import { User } from './user.entity';
export declare class PasswordResetToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    user: User;
}
