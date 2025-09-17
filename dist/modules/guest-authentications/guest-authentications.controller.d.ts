import { GuestAuthenticationsService } from './guest-authentications.service';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
export declare class GuestAuthenticationsController {
    private readonly guestAuthenticationsService;
    constructor(guestAuthenticationsService: GuestAuthenticationsService);
    create(createGuestAuthenticationDto: CreateGuestAuthenticationDto): Promise<import("../../entities").Authentication>;
}
