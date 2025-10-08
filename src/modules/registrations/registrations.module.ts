import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => HouseholdsModule),
    PublicScheduleModule,
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
