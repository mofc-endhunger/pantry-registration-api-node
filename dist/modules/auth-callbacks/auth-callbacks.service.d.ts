import { Repository } from 'typeorm';
import { FacebookAuthCallbackDto } from './dto/facebook-auth-callback.dto';
import { Identity } from '../../entities/identity.entity';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
export declare class AuthCallbacksService {
    private readonly identityRepo;
    private readonly userRepo;
    private readonly authRepo;
    constructor(identityRepo: Repository<Identity>, userRepo: Repository<User>, authRepo: Repository<Authentication>);
    facebookCallback(facebookDto: FacebookAuthCallbackDto): Promise<Authentication>;
    verifyFacebookToken(accessToken: string, userID: string): Promise<boolean>;
    private generateUniqueCode;
}
