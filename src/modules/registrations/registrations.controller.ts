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
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuestOrJwtAuthGuard } from '../auth/guest-or-jwt.guard';
import type { Request } from 'express';
import { CheckInDto } from './dto/check-in.dto';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Get('event/:eventId')
  listForEvent(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.registrationsService.listForEvent(eventId);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Registration created (confirmed or waitlisted)' })
  @Post()
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = req.user as any;
    return this.registrationsService.registerForEvent(user, dto);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Registration cancelled; waitlist promotion attempted' })
  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    return this.registrationsService.cancelRegistration(user, id);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Registration checked in' })
  @Post('check-in')
  async checkIn(@Body() dto: CheckInDto, @Req() req: Request) {
    const user = req.user as any;
    return this.registrationsService.checkIn(user, dto);
  }
}
