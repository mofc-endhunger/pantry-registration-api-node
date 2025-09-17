import { User } from './user.entity';
export declare class UserDetail {
    id: number;
    user_id: number;
    name: string;
    email: string;
    first_name: string;
    last_name: string;
    location: string;
    description: string;
    image: string;
    phone: string;
    urls: string;
    created_at: Date;
    updated_at: Date;
    user: User;
}
