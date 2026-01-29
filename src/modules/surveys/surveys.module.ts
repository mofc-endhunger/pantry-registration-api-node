import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from '../../entities/forms.entity';
import { Question } from '../../entities/questions.entity';
import { AnswerOption } from '../../entities/answer-options.entity';
import { FormAssignment } from '../../entities/form-assignments.entity';
import { SurveyTrigger } from '../../entities/survey-triggers.entity';
import { FormSubmission } from '../../entities/form-submissions.entity';
import { FormResponse } from '../../entities/form-responses.entity';
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
      Form,
      Question,
      AnswerOption,
      FormAssignment,
      SurveyTrigger,
      FormSubmission,
      FormResponse,
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
