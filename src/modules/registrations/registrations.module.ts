import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Registration } from '../../entities/registration.entity';
import { RegistrationAttendee } from '../../entities/registration-attendee.entity';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';
import { RegistrationsService } from './registrations.service';
import { CheckInAudit } from '../../entities/checkin-audit.entity';
import { RegistrationsController } from './registrations.controller';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';
import { PublicScheduleModule } from '../public-schedule/public-schedule.module';
import { Authentication } from '../../entities/authentication.entity';
import { PantryTrakClient } from '../integrations/pantrytrak.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registration,
      RegistrationAttendee,
      Event,
      EventTimeslot,
      Household,
      HouseholdMember,
      CheckInAudit,
      Authentication,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => HouseholdsModule),
    PublicScheduleModule,
    JwtModule.register({}),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, PantryTrakClient],
})
export class RegistrationsModule {}
