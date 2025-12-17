import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { randomBytes } from 'crypto';
import { SafeRandom } from '../../common/utils/safe-random';
import { PantryTrakClient } from '../integrations/pantrytrak.client';

@Injectable()
export class GuestAuthenticationsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
    @Optional() private readonly pantryTrakClient?: PantryTrakClient,
  ) {}

  async createGuest(createGuestDto: CreateGuestAuthenticationDto) {
    // Generate unique identification code (6 chars, alphanumeric)
    let identification_code: string;
    do {
      identification_code = SafeRandom.generateCode(6);
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

  async updateGuestByToken(token: string, dto: CreateGuestAuthenticationDto) {
    const auth = await this.authRepo.findOne({ where: { token }, relations: ['user'] });
    if (!auth || !auth.user) {
      throw new Error('Invalid guest token');
    }

    const user = auth.user;
    // Update only provided fields
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.first_name !== undefined) user.first_name = dto.first_name;
    if (dto.middle_name !== undefined) user.middle_name = dto.middle_name;
    if (dto.last_name !== undefined) user.last_name = dto.last_name;
    if (dto.suffix !== undefined) user.suffix = dto.suffix;
    if (dto.date_of_birth !== undefined)
      user.date_of_birth = dto.date_of_birth as unknown as string;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.address_line_1 !== undefined) user.address_line_1 = dto.address_line_1;
    if (dto.address_line_2 !== undefined) user.address_line_2 = dto.address_line_2;
    if (dto.city !== undefined) user.city = dto.city;
    if (dto.state !== undefined) user.state = dto.state;
    if (dto.zip_code !== undefined) user.zip_code = dto.zip_code;
    if (dto.seniors_in_household !== undefined)
      user.seniors_in_household = dto.seniors_in_household;
    if (dto.adults_in_household !== undefined) user.adults_in_household = dto.adults_in_household;
    if (dto.children_in_household !== undefined)
      user.children_in_household = dto.children_in_household;
    if (dto.permission_to_email !== undefined) user.permission_to_email = dto.permission_to_email;
    if (dto.permission_to_text !== undefined) user.permission_to_text = dto.permission_to_text;
    // Optional flags stored in user_detail in some systems; we map them to nulling contact fields if true
    if (dto.no_phone_number === true) user.phone = null;
    if (dto.no_email === true) user.email = null;
    if (dto.identification_code !== undefined) user.identification_code = dto.identification_code;

    await this.userRepo.save(user);

    // Sync user to PantryTrak after update (matches old system after_commit on: :update)
    try {
      if (this.pantryTrakClient) {
        await this.pantryTrakClient.createUser(user);
      }
    } catch {
      // Best-effort sync, don't block guest update
    }

    return { updated: true };
  }
}
