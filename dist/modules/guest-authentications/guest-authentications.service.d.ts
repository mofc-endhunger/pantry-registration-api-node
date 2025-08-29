import { Repository } from 'typeorm';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { JwtService } from '@nestjs/jwt';
export declare class GuestAuthenticationsService {
    private readonly userRepo;
    private readonly authRepo;
    private readonly jwtService;
    constructor(userRepo: Repository<User>, authRepo: Repository<Authentication>, jwtService: JwtService);
    createGuest(createGuestDto: CreateGuestAuthenticationDto): Promise<{
        token: string;
    }>;
}
