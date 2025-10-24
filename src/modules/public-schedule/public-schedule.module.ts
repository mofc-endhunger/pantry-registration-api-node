import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicEventSlot } from '../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../entities-public/event-date.public.entity';
import { PublicScheduleService } from './public-schedule.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublicEventSlot, PublicEventDate], 'public')],
  providers: [PublicScheduleService],
  exports: [PublicScheduleService],
})
export class PublicScheduleModule {}
