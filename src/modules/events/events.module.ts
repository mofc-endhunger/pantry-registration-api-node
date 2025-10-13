import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PublicScheduleModule } from '../public-schedule/public-schedule.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventTimeslot]), PublicScheduleModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
