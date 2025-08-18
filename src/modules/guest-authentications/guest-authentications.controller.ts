import { Controller, Post, Body } from '@nestjs/common';
import { GuestAuthenticationsService } from './guest-authentications.service';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';

@Controller('guest-authentications')
export class GuestAuthenticationsController {
  constructor(private readonly guestAuthenticationsService: GuestAuthenticationsService) {}

  @Post()
  async create(@Body() createGuestAuthenticationDto: CreateGuestAuthenticationDto) {
    return this.guestAuthenticationsService.createGuest(createGuestAuthenticationDto);
  }
}
