import { UserDetail } from './user-detail.entity';
export declare class User {
    id: number;
    identification_code: string;
    phone: string;
    credential_id: number;
    password_digest: string;
    user_type: 'guest' | 'customer';
    user_detail: UserDetail;
    created_at: Date;
    updated_at: Date;
}
