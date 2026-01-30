import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Survey } from '../../entities/survey.entity';
import { SurveyQuestion } from '../../entities/survey-question.entity';
import { AnswerOption } from '../../entities/answer-options.entity';
import { SurveyAssignment } from '../../entities/survey-assignment.entity';
import { SurveyTrigger } from '../../entities/survey-triggers.entity';
import { SurveySubmission } from '../../entities/survey-submissions.entity';
import { SurveyResponse } from '../../entities/survey-responses.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';
import { PublicScheduleModule } from '../public-schedule/public-schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Survey,
      SurveyQuestion,
      AnswerOption,
      SurveyAssignment,
      SurveyTrigger,
      SurveySubmission,
      SurveyResponse,
      Registration,
      Authentication,
    ]),
    UsersModule,
    HouseholdsModule,
    PublicScheduleModule,
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
