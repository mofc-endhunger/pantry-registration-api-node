import { Repository } from 'typeorm';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
export declare class GuestAuthenticationsService {
    private readonly userRepo;
    private readonly authRepo;
    constructor(userRepo: Repository<User>, authRepo: Repository<Authentication>);
    createGuest(createGuestDto: CreateGuestAuthenticationDto): Promise<Authentication>;
}
