/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionnaireVersion } from '../../entities/questionnaire-version.entity';
import { QuestionnaireQuestion } from '../../entities/questionnaire-question.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { SurveyFamilyAnswer } from '../../entities/survey-family-answers.entity';
import { SurveysService } from '../surveys/surveys.service';

type AuthUser = {
  authType?: string;
  dbUserId?: number;
  userId?: string;
  id?: string;
  email?: string;
  username?: string;
};

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(SurveyFamily) private readonly familiesRepo: Repository<SurveyFamily>,
    @InjectRepository(SurveyFamilyAnswer)
    private readonly responsesRepo: Repository<SurveyFamilyAnswer>,
    @InjectRepository(QuestionnaireVersion)
    private readonly qvRepo: Repository<QuestionnaireVersion>,
    @InjectRepository(QuestionnaireQuestion)
    private readonly qqRepo: Repository<QuestionnaireQuestion>,
    @InjectRepository(Registration)
    private readonly regsRepo: Repository<Registration>,
    @InjectRepository(Authentication)
    private readonly authRepo: Repository<Authentication>,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly surveysService: SurveysService,
  ) {}

  private async resolveDbUserId(user: AuthUser, guestToken?: string): Promise<number> {
    if (guestToken) {
      const auth = await this.authRepo.findOne({ where: { token: guestToken } });
      if (auth?.user_id) return auth.user_id as unknown as number;
    }
    if (user?.authType === 'guest' && typeof user.dbUserId === 'number') {
      return user.dbUserId;
    }
    const sub = (user?.userId as string) ?? (user?.id as string);
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(sub);
    if (!dbUserId) throw new ForbiddenException('User not found');
    return dbUserId;
  }

  private async assertRegistrationOwnership(registrationId: number, dbUserId: number) {
    const r = await this.regsRepo.findOne({ where: { id: registrationId } });
    if (!r) throw new NotFoundException('Registration not found');
    const householdId = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!householdId) throw new ForbiddenException('Household not resolved');
    if (String(r.household_id) !== String(householdId)) throw new ForbiddenException();
    return r;
  }

  private async getActiveQuestionnaire() {
    const qv =
      (await this.qvRepo.findOne({
        where: { is_active: true },
        order: { version: 'DESC' as any },
      })) ?? null;
    if (!qv) {
      // fallback scaffold (no persistence)
      return {
        id: 0,
        version: 1,
        title: 'Post-Event Feedback',
        questions: [
          {
            id: 101,
            order: 1,
            type: 'scale_1_5',
            prompt: 'How satisfied were you with check-in?',
            required: true,
          },
          {
            id: 102,
            order: 2,
            type: 'scale_1_5',
            prompt: 'How satisfied were you with wait time?',
            required: true,
          },
          {
            id: 103,
            order: 3,
            type: 'scale_1_5',
            prompt: 'How satisfied were you with overall service?',
            required: true,
          },
        ],
      };
    }
    const questions = await this.qqRepo.find({
      where: { questionnaire_version_id: qv.id },
      order: { display_order: 'ASC' as any },
    });
    return {
      id: qv.id,
      version: qv.version,
      title: qv.title,
      questions: questions.map((q) => ({
        id: q.id,
        order: q.display_order,
        type: q.type,
        prompt: q.prompt,
        required: q.required,
      })),
    };
  }

  async getForReservation(params: { user: AuthUser; guestToken?: string; registrationId: number }) {
    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    const _reg = await this.assertRegistrationOwnership(params.registrationId, dbUserId);
    const existing = await this.familiesRepo.findOne({
      where: { linkage_type_NK: params.registrationId },
      order: { date_added: 'DESC' as any },
    });
    if (existing) {
      const responses = await this.responsesRepo.find({
        where: { survey_family_id: Number(existing.survey_family_id) },
      });
      const active = await this.surveysService.getActive({
        user: params.user,
        guestToken: params.guestToken,
        registrationId: params.registrationId,
      });
      let questionnaire: any;
      if ((active as any)?.has_active && (active as any)?.survey) {
        const s = (active as any).survey;
        {
          const qs: any[] = Array.isArray(s.questions) ? (s.questions as any[]) : [];
          questionnaire = {
            id: s.id,
            version: 1,
            title: s.title,
            questions: qs.map((q: any) => ({
              id: q.id,
              order: q.order,
              type: q.type,
              prompt: q.prompt,
              required: true,
            })),
          };
        }
      } else {
        questionnaire = await this.getActiveQuestionnaire();
      }
      return {
        id: Number(existing.survey_family_id),
        registration_id: params.registrationId,
        has_submitted: true,
        submitted_at: existing.date_added?.toISOString?.() ?? null,
        rating:
          responses.map((r) => Number(r.answer_value)).find((n) => Number.isFinite(n)) ?? null,
        comments: null,
        questionnaire,
        responses: responses.map((r) => {
          const v = Number(r.answer_value);
          return {
            question_id: r.survey_question_id,
            scale_value: Number.isFinite(v) ? v : undefined,
          };
        }),
      };
    }
    const active = await this.surveysService.getActive({
      user: params.user,
      guestToken: params.guestToken,
      registrationId: params.registrationId,
    });
    let questionnaire: any;
    if ((active as any)?.has_active && (active as any)?.survey) {
      const s = (active as any).survey;
      {
        const qs: any[] = Array.isArray(s.questions) ? (s.questions as any[]) : [];
        questionnaire = {
          id: s.id,
          version: 1,
          title: s.title,
          questions: qs.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            required: true,
          })),
        };
      }
    } else {
      questionnaire = await this.getActiveQuestionnaire();
    }
    return {
      id: null,
      registration_id: params.registrationId,
      has_submitted: false,
      submitted_at: null,
      rating: null,
      comments: null,
      questionnaire,
      responses: [],
    };
  }

  async submitForReservation(params: {
    user: AuthUser;
    guestToken?: string;
    registrationId: number;
    dto: SubmitFeedbackDto;
    meta?: { ip?: string; userAgent?: string };
  }) {
    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    const _reg2 = await this.assertRegistrationOwnership(params.registrationId, dbUserId);

    const dupe = await this.familiesRepo.findOne({
      where: { linkage_type_NK: params.registrationId },
      order: { date_added: 'DESC' as any },
    });
    if (dupe) throw new ConflictException('Feedback already submitted for this registration');

    const active = await this.surveysService.getActive({
      user: params.user,
      guestToken: params.guestToken,
      registrationId: params.registrationId,
    });
    if (!(active as any)?.has_active || !(active as any)?.survey || !(active as any)?.trigger) {
      throw new ConflictException('No active survey configured for this reservation');
    }

    // Submit using the SurveysService to centralize keys/window logic
    const result = await this.surveysService.submit({
      user: params.user,
      guestToken: params.guestToken,
      dto: {
        survey_id: (active as any).survey!.id,
        trigger_id: (active as any).trigger!.id,
        registration_id: params.registrationId,
        overall_rating: params.dto.rating,
        comments: params.dto.comments ?? null,
        responses: (params.dto.responses ?? []).map((r) => ({
          question_id: r.question_id,
          answer_value: String(r.scale_value ?? ''),
        })),
      } as any,
      meta: params.meta,
    });

    return {
      id: result.id,
      registration_id: params.registrationId,
      submitted_at: new Date().toISOString(),
      rating: params.dto.rating,
      comments: params.dto.comments ?? null,
    };
  }
}
