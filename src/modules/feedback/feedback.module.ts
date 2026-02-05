import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionnaireVersion } from '../../entities/questionnaire-version.entity';
import { QuestionnaireQuestion } from '../../entities/questionnaire-question.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { SurveySubmission } from '../../entities/survey-submissions.entity';
import { SurveyResponse } from '../../entities/survey-responses.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionnaireVersion,
      QuestionnaireQuestion,
      Registration,
      Authentication,
      SurveySubmission,
      SurveyResponse,
    ]),
    UsersModule,
    HouseholdsModule,
    SurveysModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
