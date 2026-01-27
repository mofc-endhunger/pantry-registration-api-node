/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { GuestOrJwtAuthGuard } from '../auth/guest-or-jwt.guard';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@ApiTags('feedback')
@Controller('reservations')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'Get feedback or questionnaire for a reservation' })
  @Get(':id/feedback')
  async getForReservation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.feedbackService.getForReservation({ user, guestToken, registrationId: id });
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'Submit feedback for a reservation' })
  @Post(':id/feedback')
  async submitForReservation(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitFeedbackDto,
  ) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      (req.socket?.remoteAddress as string) ||
      undefined;
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.feedbackService.submitForReservation({
      user,
      guestToken,
      registrationId: id,
      dto,
      meta: { ip, userAgent },
    });
  }
}
