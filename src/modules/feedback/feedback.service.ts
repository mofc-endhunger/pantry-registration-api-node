/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../entities/feedback.entity';
import { FeedbackResponse } from '../../entities/feedback-response.entity';
import { QuestionnaireVersion } from '../../entities/questionnaire-version.entity';
import { QuestionnaireQuestion } from '../../entities/questionnaire-question.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

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
    @InjectRepository(Feedback) private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(FeedbackResponse)
    private readonly responseRepo: Repository<FeedbackResponse>,
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
    const reg = await this.assertRegistrationOwnership(params.registrationId, dbUserId);
    const existing = await this.feedbackRepo.findOne({
      where: { registration_id: params.registrationId },
    });
    if (existing) {
      const responses = await this.responseRepo.find({
        where: { feedback_id: Number(existing.id) },
      });
      const questionnaire = await this.getActiveQuestionnaire();
      return {
        id: Number(existing.id),
        registration_id: params.registrationId,
        has_submitted: true,
        submitted_at: existing.submitted_at?.toISOString?.() ?? null,
        rating: existing.rating,
        comments: existing.comments ?? null,
        questionnaire,
        responses: responses.map((r) => ({
          question_id: r.question_id,
          scale_value: r.scale_value ?? undefined,
        })),
      };
    }
    const questionnaire = await this.getActiveQuestionnaire();
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
    const reg = await this.assertRegistrationOwnership(params.registrationId, dbUserId);

    const dupe = await this.feedbackRepo.findOne({
      where: { registration_id: params.registrationId },
    });
    if (dupe) throw new ConflictException('Feedback already submitted for this registration');

    // Basic validation already done via DTO; optionally validate responses align with questionnaire
    const questionnaire = await this.getActiveQuestionnaire();
    const requiredIds = new Set(
      questionnaire.questions.filter((q: any) => q.required).map((q: any) => q.id),
    );
    const provided = new Map<number, number | undefined>();
    (params.dto.responses ?? []).forEach((r) => {
      provided.set(r.question_id, r.scale_value);
    });
    for (const id of requiredIds) {
      if (!provided.has(id)) {
        throw new ConflictException('Required questionnaire responses missing');
      }
      const v = provided.get(id);
      if (v == null || v < 1 || v > 5) {
        throw new ConflictException('Invalid questionnaire response value');
      }
    }

    const f = await this.feedbackRepo.save({
      registration_id: params.registrationId,
      user_id: dbUserId,
      event_id: reg.event_id,
      questionnaire_version_id: questionnaire.id || null,
      rating: params.dto.rating,
      comments: params.dto.comments ?? null,
      user_agent: params.meta?.userAgent ?? null,
      ip: params.meta?.ip ? Buffer.from(params.meta.ip) : null,
    } as any);
    const feedbackId = Number(f.id);

    if (params.dto.responses?.length) {
      const rows = params.dto.responses.map((r) => ({
        feedback_id: feedbackId,
        question_id: r.question_id,
        scale_value: r.scale_value ?? null,
      }));
      await this.responseRepo.insert(rows as any);
    }

    return {
      id: feedbackId,
      registration_id: params.registrationId,
      submitted_at: (f.submitted_at as Date)?.toISOString?.() ?? new Date().toISOString(),
      rating: f.rating,
      comments: f.comments,
    };
  }
}
