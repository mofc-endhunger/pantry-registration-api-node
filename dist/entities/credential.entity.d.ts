import { User } from './user.entity';
export declare class Credential {
    id: number;
    user_id: number;
    token: string;
    secret: string;
    expires: boolean;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
    user: User;
}
