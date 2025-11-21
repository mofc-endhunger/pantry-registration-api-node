import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  HttpCode,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuestOrJwtAuthGuard } from '../auth/guest-or-jwt.guard';
import type { Request } from 'express';
import { CheckInDto } from './dto/check-in.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('staff', 'admin')
  @Get('event/:eventId')
  listForEvent(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.registrationsService.listForEvent(eventId);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @Get('me')
  listForMe(@Req() req: Request) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.registrationsService.listForMe(user, guestToken);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiCreatedResponse({ description: 'Registration created (confirmed or waitlisted)' })
  @Post()
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.registrationsService.registerForEvent(user, dto as any, guestToken);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'Registration cancelled; waitlist promotion attempted' })
  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    return this.registrationsService.cancelRegistration(user, id);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'Registration checked in' })
  @Post('check-in')
  @HttpCode(200)
  async checkIn(@Body() dto: CheckInDto, @Req() req: Request) {
    const user = req.user as any;
    return this.registrationsService.checkIn(user, dto);
  }
}
