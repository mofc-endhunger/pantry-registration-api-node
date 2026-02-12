/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { SurveyFamilyAnswer } from '../../entities/survey-family-answers.entity';
import { PublicSurvey } from '../../entities-public/survey.public.entity';
import { PublicSurveyQuestionLibrary } from '../../entities-public/survey-question-library.public.entity';
import { PublicSurveyAnswerLibrary } from '../../entities-public/survey-answer-library.public.entity';
import { PublicSurveyQuestionMap } from '../../entities-public/survey-question-map.public.entity';
import { Registration } from '../../entities/registration.entity';
import { Authentication } from '../../entities/authentication.entity';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';
import { PublicScheduleService } from '../public-schedule/public-schedule.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';

type AuthUser = {
  authType?: string;
  dbUserId?: number;
  userId?: string;
  id?: string;
  email?: string;
  username?: string;
};

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(SurveyFamily) private readonly familiesRepo: Repository<SurveyFamily>,
    @InjectRepository(SurveyFamilyAnswer)
    private readonly familyAnswersRepo: Repository<SurveyFamilyAnswer>,
    @InjectRepository(PublicSurvey, 'public')
    private readonly surveysRepo: Repository<PublicSurvey>,
    @InjectRepository(PublicSurveyQuestionLibrary, 'public')
    private readonly questionsLibRepo: Repository<PublicSurveyQuestionLibrary>,
    @InjectRepository(PublicSurveyAnswerLibrary, 'public')
    private readonly answersLibRepo: Repository<PublicSurveyAnswerLibrary>,
    @InjectRepository(PublicSurveyQuestionMap, 'public')
    private readonly questionMapRepo: Repository<PublicSurveyQuestionMap>,
    @InjectRepository(Registration) private readonly regsRepo: Repository<Registration>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly publicSchedule: PublicScheduleService,
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

  private toDateKey(dateIso: string | null): number {
    if (!dateIso) {
      const d = new Date();
      return parseInt(
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`,
        10,
      );
    }
    return parseInt(dateIso.replace(/-/g, ''), 10);
  }

  private toTimeKey(date: Date = new Date()): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  async getActive(params: { user: AuthUser; guestToken?: string; registrationId?: number }) {
    // For v1: transactional context only if registrationId provided
    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    let survey: PublicSurvey | null = null;

    if (params.registrationId) {
      await this.assertRegistrationOwnership(params.registrationId, dbUserId);
      // Placeholder strategy: latest active survey in public
      survey =
        (await this.surveysRepo.findOne({
          where: { status_id: 1 },
          order: { survey_id: 'DESC' as any },
        })) ?? null;
    } else {
      // No context → no active survey
      return { has_active: false };
    }

    if (!survey) return { has_active: false };

    // Prevent duplicates (completed) on families table
    const dupe = await this.familiesRepo.findOne({
      where: { survey_id: survey.survey_id, linkage_type_NK: params.registrationId },
      order: { date_added: 'DESC' as any },
    });
    if (dupe && dupe.survey_status === 'completed') return { has_active: false };

    const maps = await this.questionMapRepo.find({
      where: { survey_id: survey.survey_id },
      order: { display_order: 'ASC' as any },
    });
    const qIds = maps.map((m) => m.question_id);
    const questionsLib = qIds.length
      ? await this.questionsLibRepo.findBy({ question_id: qIds as unknown as any })
      : [];
    const byLibId = new Map<number, PublicSurveyQuestionLibrary>();
    questionsLib.forEach((q) => byLibId.set(q.question_id, q));
    const answers = await this.answersLibRepo.find();
    const byQuestion = new Map<number, PublicSurveyAnswerLibrary[]>();
    answers.forEach((a) => {
      const arr = byQuestion.get(a.question_id) ?? [];
      arr.push(a);
      byQuestion.set(a.question_id, arr);
    });
    return {
      has_active: true,
      survey: {
        id: survey.survey_id,
        title: survey.survey_title,
        questions: maps.map((m) => {
          const lib = byLibId.get(m.question_id);
          return {
            id: m.survey_question_id,
            type: lib?.question_type ?? 'scale_1_5',
            prompt: lib?.question_text ?? '',
            order: m.display_order,
            options: (byQuestion.get(m.question_id) ?? []).map((o) => ({
              id: o.answer_id,
              value: o.answer_value,
              label: o.answer_text,
              order: o.display_order,
            })),
          };
        }),
      },
      // v5 has assignment/trigger; for v1 facade we return a simple stub
      trigger: { id: 0, type: 'transaction' },
    };
  }

  async submit(params: {
    user: AuthUser;
    guestToken?: string;
    dto: SubmitSurveyDto;
    meta?: { ip?: string; userAgent?: string };
  }) {
    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    let regDateIso: string | null = null;
    if (params.dto.registration_id) {
      const reg = await this.assertRegistrationOwnership(params.dto.registration_id, dbUserId);
      regDateIso = (reg as any).public_event_date_id
        ? await this.publicSchedule.getDateIsoForDateId((reg as any).public_event_date_id as number)
        : (reg as any).public_event_slot_id
          ? await this.publicSchedule.getDateIsoForSlotId(
              (reg as any).public_event_slot_id as number,
            )
          : null;
      // Enforce 14-day window if we have a date
      if (regDateIso) {
        const todayIso = new Date().toISOString().slice(0, 10);
        if (todayIso < regDateIso) {
          throw new ForbiddenException('Feedback not yet available for this event');
        }
        const diffDays =
          (new Date(todayIso).getTime() - new Date(regDateIso).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 14) {
          throw new ForbiddenException('Feedback window has closed');
        }
      }
      // Prevent duplicates (completed) on families table
      const dupe = await this.familiesRepo.findOne({
        where: {
          survey_id: params.dto.survey_id,
          linkage_type_NK: params.dto.registration_id,
        },
        order: { date_added: 'DESC' as any },
      });
      if (dupe && dupe.survey_status === 'completed')
        throw new ConflictException('Survey already submitted for this registration');
    }

    // Insert family (completed now for v1 facade)
    const family = await this.familiesRepo.save({
      survey_id: params.dto.survey_id,
      linkage_type_id: 0, // registration linkage type placeholder
      linkage_type_NK: params.dto.registration_id ?? 0,
      survey_status: 'completed',
      started_at: new Date(),
      completed_at: new Date(),
      status_id: 1,
    } as any);
    const familyId = Number(family.survey_family_id);

    if (params.dto.responses?.length) {
      const rows = params.dto.responses.map((r) => ({
        survey_family_id: familyId,
        survey_question_id: r.question_id,
        answer_id: null,
        answer_value: r.answer_value ?? null,
        answer_text: null,
      }));
      await this.familyAnswersRepo.insert(rows as any);
    }

    return {
      id: familyId,
      survey_id: params.dto.survey_id,
      trigger_id: params.dto.trigger_id,
      registration_id: params.dto.registration_id ?? null,
    };
  }
}
