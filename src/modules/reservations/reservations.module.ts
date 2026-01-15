import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Registration } from '../../entities/registration.entity';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';
import { Authentication } from '../../entities/authentication.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration, Event, EventTimeslot, Authentication]),
    forwardRef(() => UsersModule),
    forwardRef(() => HouseholdsModule),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
