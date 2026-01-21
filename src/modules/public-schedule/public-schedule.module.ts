import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicEventSlot } from '../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../entities-public/event-date.public.entity';
import { PublicEventHour } from '../../entities-public/event-hour.public.entity';
import { PublicDimTime } from '../../entities-public/dim-time.public.entity';
import { PublicEvent } from '../../entities-public/event.public.entity';
import { PublicScheduleService } from './public-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [PublicEventSlot, PublicEventDate, PublicEventHour, PublicDimTime, PublicEvent],
      'public',
    ),
  ],
  providers: [PublicScheduleService],
  exports: [PublicScheduleService],
})
export class PublicScheduleModule {}
