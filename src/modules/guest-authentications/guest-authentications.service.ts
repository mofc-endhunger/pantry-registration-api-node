import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class GuestAuthenticationsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
  ) {}

  async createGuest(createGuestDto: CreateGuestAuthenticationDto) {
    // Generate unique identification code (6 chars, alphanumeric)
    let identification_code: string;
    do {
      identification_code = randomBytes(3).toString('hex').slice(0, 6).toUpperCase();
    } while (await this.userRepo.findOne({ where: { identification_code } }));

    const user = this.userRepo.create({
      identification_code,
      user_type: 'guest',
      phone: createGuestDto.phone,
      // Add other fields as needed
    });
    await this.userRepo.save(user);

    // Create authentication token (random 32 chars)
    const token = randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const authentication = this.authRepo.create({
      user_id: user.id,
      token,
      expires_at,
      user,
    });
    await this.authRepo.save(authentication);

    return authentication;
  }
}
