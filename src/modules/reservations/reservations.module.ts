import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Registration } from '../../entities/registration.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';
import { Authentication } from '../../entities/authentication.entity';
import { PublicScheduleModule } from '../public-schedule/public-schedule.module';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { PublicSurvey } from '../../entities-public/survey.public.entity';
import { PublicSurveyQuestionMap } from '../../entities-public/survey-question-map.public.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registration,
      EventTimeslot,
      Authentication,
      SurveyFamily,
      PublicSurvey,
      PublicSurveyQuestionMap,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => HouseholdsModule),
    PublicScheduleModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
