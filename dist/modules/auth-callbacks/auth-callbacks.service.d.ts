import { FacebookAuthCallbackDto } from './dto/facebook-auth-callback.dto';
export declare class AuthCallbacksService {
    facebookCallback(facebookDto: FacebookAuthCallbackDto): Promise<{
        message: string;
        facebookDto: FacebookAuthCallbackDto;
    }>;
}
