import { Injectable } from '@nestjs/common';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';

@Injectable()
export class GuestAuthenticationsService {
  async createGuest(createGuestDto: CreateGuestAuthenticationDto) {
    // TODO: Implement guest user creation logic
    return { message: 'Guest user creation not implemented', createGuestDto };
  }
}
