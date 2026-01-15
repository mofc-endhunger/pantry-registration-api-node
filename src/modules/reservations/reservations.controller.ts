/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Query, UseGuards, Req, Param, ParseIntPipe } from '@nestjs/common';
import type { Request } from 'express';
import { ReservationsService } from './reservations.service';
import { GuestOrJwtAuthGuard } from '../auth/guest-or-jwt.guard';
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'List current user reservations (local-only)' })
  @Get()
  async list(
    @Req() req: Request,
    @Query('type') type?: 'upcoming' | 'past' | 'all',
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.reservationsService.listForMe({
      user,
      guestToken,
      type: (type as any) ?? 'all',
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'Get a single reservation (local-only)' })
  @Get(':id')
  async getOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.reservationsService.getOne({ user, guestToken, id });
  }
}
