import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '../../entities/feedback.entity';
import { FeedbackResponse } from '../../entities/feedback-response.entity';
import { QuestionnaireVersion } from '../../entities/questionnaire-version.entity';
import { QuestionnaireQuestion } from '../../entities/questionnaire-question.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Feedback,
      FeedbackResponse,
      QuestionnaireVersion,
      QuestionnaireQuestion,
      Registration,
      Authentication,
    ]),
    UsersModule,
    HouseholdsModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
