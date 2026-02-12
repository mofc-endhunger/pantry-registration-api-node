import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { SurveyFamilyAnswer } from '../../entities/survey-family-answers.entity';
import { PublicSurvey } from '../../entities-public/survey.public.entity';
import { PublicSurveyQuestionLibrary } from '../../entities-public/survey-question-library.public.entity';
import { PublicSurveyAnswerLibrary } from '../../entities-public/survey-answer-library.public.entity';
import { PublicSurveyQuestionMap } from '../../entities-public/survey-question-map.public.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';
import { PublicScheduleModule } from '../public-schedule/public-schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyFamily, SurveyFamilyAnswer, Registration, Authentication]),
    TypeOrmModule.forFeature(
      [
        PublicSurvey,
        PublicSurveyQuestionLibrary,
        PublicSurveyAnswerLibrary,
        PublicSurveyQuestionMap,
      ],
      'public',
    ),
    UsersModule,
    HouseholdsModule,
    PublicScheduleModule,
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
