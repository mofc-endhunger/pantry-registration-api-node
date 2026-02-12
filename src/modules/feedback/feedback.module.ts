import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionnaireVersion } from '../../entities/questionnaire-version.entity';
import { QuestionnaireQuestion } from '../../entities/questionnaire-question.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { SurveyFamilyAnswer } from '../../entities/survey-family-answers.entity';
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
      SurveyFamily,
      SurveyFamilyAnswer,
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
