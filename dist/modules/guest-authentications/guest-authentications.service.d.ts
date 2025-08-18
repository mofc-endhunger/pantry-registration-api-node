import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
export declare class GuestAuthenticationsService {
    createGuest(createGuestDto: CreateGuestAuthenticationDto): Promise<{
        message: string;
        createGuestDto: CreateGuestAuthenticationDto;
    }>;
}
