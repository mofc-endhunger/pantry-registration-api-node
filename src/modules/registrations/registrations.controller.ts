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
  Query,
  HttpCode,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuestOrJwtAuthGuard } from '../auth/guest-or-jwt.guard';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth-user.interface';
import { CheckInDto } from './dto/check-in.dto';
import { CreatedByMeQueryDto } from './dto/created-by-me-query.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiSecurity,
  ApiUnprocessableEntityResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
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
    const user = req.user as AuthUser;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.registrationsService.listForMe(user, guestToken);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiCreatedResponse({ description: 'Registration created, always confirmed' })
  @ApiConflictResponse({
    description:
      'SLOT_FULL (SUP-1169): the slot, or its date, has no place left. Nothing is saved; there ' +
      'is no waitlist. Body: { message: "This time slot is at capacity", code: "SLOT_FULL" }',
  })
  @ApiBadRequestResponse({
    description:
      'ALREADY_REGISTERED (SUP-1171): the household already holds a place on this date (or ' +
      'this event, when no date is sent). Simultaneous requests from one household save one ' +
      'booking; the rest get this. `registration` is the booking that already exists. Also ' +
      'returned for validation failures, without a `code`.',
    schema: {
      example: {
        message: 'Already registered',
        error: 'BadRequestException',
        status: 400,
        code: 'ALREADY_REGISTERED',
        registration: {
          id: '1234',
          event_id: '56',
          public_event_date_id: 789,
          public_event_slot_id: 1011,
          status: 'confirmed',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Event, time slot or event date not found' })
  @ApiForbiddenResponse({
    description: 'Non-case-manager sent registrant payload, or user not resolved',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'INCOMPLETE_REGISTRANT (SUP-1141, while REQUIRE_COMPLETE_REGISTRANT=true): the registrant ' +
      "(the user, or the case manager's `registrant` payload) lacks what PantryTrak needs — first " +
      'and last name, a street line of 5+ characters, a 5-digit ZIP. `missing` lists the failing ' +
      'fields. See docs/prd-reservations.md §12a.',
    schema: {
      example: {
        message: 'Registrant profile is incomplete',
        error: 'UnprocessableEntityException',
        status: 422,
        code: 'INCOMPLETE_REGISTRANT',
        missing: ['last_name', 'address_line_1'],
      },
    },
  })
  @Post()
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    const guestToken = (req.headers['x-guest-token'] as string) || undefined;
    return this.registrationsService.registerForEvent(user, dto, guestToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('case_managers')
  @ApiBearerAuth('JWT-auth')
  @ApiOkResponse({ description: 'Registrations created by the authenticated case manager' })
  @Get('created-by-me')
  async getCreatedByMe(@Req() req: Request, @Query() query: CreatedByMeQueryDto) {
    const user = req.user as AuthUser;
    return this.registrationsService.findByCreatedBy(user, query);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({
    description: 'Registration cancelled; its place is given back once, if it held one',
  })
  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.registrationsService.cancelRegistration(user, id);
  }

  @UseGuards(GuestOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('Guest-Token')
  @ApiOkResponse({ description: 'Registration checked in' })
  @Post('check-in')
  @HttpCode(200)
  async checkIn(@Body() dto: CheckInDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.registrationsService.checkIn(user, dto);
  }
}
