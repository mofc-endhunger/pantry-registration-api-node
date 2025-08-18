import { UserDetail } from './user-detail.entity';
import { Authentication } from './authentication.entity';
import { Identity } from './identity.entity';
export declare class User {
    id: number;
    identification_code: string;
    email: string;
    phone: string;
    credential_id: number;
    password_digest: string;
    user_type: 'guest' | 'customer';
    user_detail: UserDetail;
    authentications: Authentication[];
    identities: Identity[];
    created_at: Date;
    updated_at: Date;
}
