import { User } from './user.entity';
export declare class Identity {
    id: number;
    user_id: number;
    provider_uid: string;
    provider_type: string;
    auth_hash: string;
    created_at: Date;
    updated_at: Date;
    user: User;
}
