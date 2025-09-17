import { User } from './user.entity';
export declare class Authentication {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
    user: User;
}
