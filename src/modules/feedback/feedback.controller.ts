/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Get feedback for a reservation',
    description:
      'Returns submitted feedback if present; otherwise returns the active questionnaire scaffold.',
  })
  @ApiOkResponse({
    description: 'Feedback or questionnaire for the reservation',
  })
  @Get(':id/feedback')
  async getForReservation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    if (process.env.FEATURE_FEEDBACK !== 'true') {
      // Feature disabled: return scaffold without touching DB
      return {
        id: null,
        registration_id: id,
        has_submitted: false as const,
        submitted_at: null as string | null,
        rating: null as number | null,
        comments: null as string | null,
        questionnaire: {
          id: 0,
          version: 1,
          title: 'Post-Event Feedback',
          questions: [
            {
              id: 101,
              order: 1,
              type: 'scale_1_5',
              prompt: 'How satisfied were you with check-in?',
              required: true,
            },
            {
              id: 102,
              order: 2,
              type: 'scale_1_5',
              prompt: 'How satisfied were you with wait time?',
              required: true,
            },
            {
              id: 103,
              order: 3,
              type: 'scale_1_5',
              prompt: 'How satisfied were you with overall service?',
              required: true,
            },
          ],
        },
        responses: [] as Array<{ question_id: number; scale_value?: number }>,
      };
    }
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.feedbackService.getForReservation({ user, guestToken, registrationId: id });
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOperation({
    summary: 'Submit feedback for a reservation',
    description:
      'Creates feedback once per registration. Requires a 1–5 rating; comments optional; questionnaire responses optional.',
  })
  @ApiBody({ type: SubmitFeedbackDto })
  @ApiResponse({ status: 201, description: 'Feedback created' })
  @ApiResponse({ status: 409, description: 'Feedback already submitted for this registration' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 501, description: 'Feedback storage is disabled' })
  @Post(':id/feedback')
  async submitForReservation(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitFeedbackDto,
  ) {
    if (process.env.FEATURE_FEEDBACK !== 'true') {
      return {
        status: 501,
        message: 'Feedback feature is disabled in this environment',
      };
    }
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
