import { Controller, Post, Body, Patch, Req, BadRequestException } from '@nestjs/common';
import { GuestAuthenticationsService } from './guest-authentications.service';
import { CreateGuestAuthenticationDto } from './dto/create-guest-authentication.dto';
import type { Request } from 'express';

@Controller('guest-authentications')
export class GuestAuthenticationsController {
  constructor(private readonly guestAuthenticationsService: GuestAuthenticationsService) {}

  @Post()
  async create(@Body() createGuestAuthenticationDto: CreateGuestAuthenticationDto) {
    return this.guestAuthenticationsService.createGuest(createGuestAuthenticationDto);
  }

  @Patch()
  async update(@Req() req: Request, @Body() dto: CreateGuestAuthenticationDto) {
    const token = (req.headers['x-guest-token'] as string) || '';
    if (!token) throw new BadRequestException('X-Guest-Token header required');
    return this.guestAuthenticationsService.updateGuestByToken(token, dto);
  }
}
