import { AuthCallbacksService } from './auth-callbacks.service';
import { FacebookAuthCallbackDto } from './dto/facebook-auth-callback.dto';
export declare class AuthCallbacksController {
    private readonly authCallbacksService;
    constructor(authCallbacksService: AuthCallbacksService);
    facebookCallback(facebookAuthCallbackDto: FacebookAuthCallbackDto): Promise<import("../../entities").Authentication>;
}
