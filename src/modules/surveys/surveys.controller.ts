/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Post, Query, Req, UseGuards, Body } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { GuestOrJwtAuthGuard } from '../auth/guest-or-jwt.guard';
import { SurveysService } from './surveys.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';

@ApiTags('surveys')
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOperation({
    summary: 'Get active survey for context',
    description:
      'Evaluates transactional eligibility based on registration_id and returns a form if available.',
  })
  @ApiOkResponse({ description: 'Active survey or has_active=false' })
  @Get('active')
  async getActive(@Req() req: Request, @Query('registration_id') registrationId?: string) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    const id = registrationId ? parseInt(registrationId, 10) : undefined;
    return this.surveysService.getActive({ user, guestToken, registrationId: id });
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOperation({
    summary: 'Submit survey form',
    description:
      'Persists a form submission and responses. Enforces 14-day window for transactional context.',
  })
  @ApiBody({ type: SubmitSurveyDto })
  @ApiResponse({ status: 201, description: 'Submission created' })
  @ApiResponse({ status: 409, description: 'Duplicate submission' })
  @Post('submit')
  async submit(@Req() req: Request, @Body() dto: SubmitSurveyDto) {
    const user = req.user as any;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      (req.socket?.remoteAddress as string) ||
      undefined;
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.surveysService.submit({ user, guestToken, dto, meta: { ip, userAgent } });
  }
}
