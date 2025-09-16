import { GuestAuthenticationsService } from './guest-authentications.service';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
export declare class GuestAuthenticationsController {
    private readonly guestAuthenticationsService;
    constructor(guestAuthenticationsService: GuestAuthenticationsService);
    create(createGuestAuthenticationDto: CreateGuestAuthenticationDto): Promise<{
        token: string;
        expires_at: Date;
        user_id: number;
    }>;
}
