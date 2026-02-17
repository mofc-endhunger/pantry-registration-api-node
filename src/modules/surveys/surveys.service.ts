/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { SurveyFamilyAnswer } from '../../entities/survey-family-answers.entity';
import { PublicSurvey } from '../../entities-public/survey.public.entity';
import { PublicSurveyQuestionLibrary } from '../../entities-public/survey-question-library.public.entity';
import { PublicSurveyAnswerLibrary } from '../../entities-public/survey-answer-library.public.entity';
import { PublicSurveyQuestionMap } from '../../entities-public/survey-question-map.public.entity';
import { PublicAnswerType } from '../../entities-public/types-answer.public.entity';
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
    @InjectRepository(PublicSurvey)
    private readonly surveysRepo: Repository<PublicSurvey>,
    @InjectRepository(PublicSurveyQuestionLibrary)
    private readonly questionsLibRepo: Repository<PublicSurveyQuestionLibrary>,
    @InjectRepository(PublicSurveyAnswerLibrary)
    private readonly answersLibRepo: Repository<PublicSurveyAnswerLibrary>,
    @InjectRepository(PublicSurveyQuestionMap)
    private readonly questionMapRepo: Repository<PublicSurveyQuestionMap>,
    @InjectRepository(PublicAnswerType)
    private readonly answerTypesRepo: Repository<PublicAnswerType>,
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
      // Placeholder strategy: latest active survey in public, with column compatibility
      survey = await this.fetchLatestActiveSurveyCompat();
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
      where: { survey_id: survey.survey_id, status_id: 1 as any },
      order: { display_order: 'ASC' as any },
    });
    const qIds = maps.map((m) => m.question_id);
    const questionsLib = qIds.length
      ? await this.questionsLibRepo.find({
          where: { question_id: In(qIds), language_id: survey.language_id, status_id: 1 as any },
        })
      : [];
    const byLibId = new Map<number, PublicSurveyQuestionLibrary>();
    questionsLib.forEach((q) => byLibId.set(q.question_id, q));
    const typeIds = Array.from(
      new Set(questionsLib.map((q) => q.answer_type_id).filter((v) => typeof v === 'number')),
    );
    const answerTypes = typeIds.length
      ? await this.answerTypesRepo.find({
          where: { answer_type_id: In(typeIds), status_id: 1 as any },
        })
      : [];
    const byTypeId = new Map<number, PublicAnswerType>();
    answerTypes.forEach((t) => byTypeId.set(t.answer_type_id, t));
    const answers = qIds.length
      ? await this.answersLibRepo.find({
          where: { question_id: In(qIds), status_id: 1, language_id: survey.language_id },
          order: { question_id: 'ASC' as any, display_order: 'ASC' as any },
        })
      : [];
    const byQuestion = new Map<number, PublicSurveyAnswerLibrary[]>();
    answers.forEach((a) => {
      const arr = byQuestion.get(a.question_id) ?? [];
      arr.push(a);
      byQuestion.set(a.question_id, arr);
    });

    // Build flat question list (back-compat) and sectioned structure
    const buildQuestion = (m: PublicSurveyQuestionMap) => {
      const lib = byLibId.get(m.question_id);
      const at =
        typeof lib?.answer_type_id === 'number' ? byTypeId.get(lib.answer_type_id) : undefined;
      const qType = at?.answer_type_code ?? lib?.question_type ?? 'scale_1_5';
      const opts = (byQuestion.get(m.question_id) ?? []).map((o) => ({
        id: o.answer_id,
        value: o.answer_value,
        label: o.answer_text,
        order: o.display_order,
      }));
      const q: any = {
        id: m.survey_question_id,
        type: qType,
        prompt: lib?.question_text ?? '',
        order: m.display_order,
        section_id: m.section_id ?? null,
        required: m.is_required === 1,
        options: opts,
      };
      if (opts.length > 0) q.answers = opts; // alias for UIs expecting `answers`
      if (at) {
        q.answerType = {
          id: at.answer_type_id,
          name: at.answer_type_name,
          code: at.answer_type_code,
        };
      }
      return q;
    };

    const flatQuestions = maps.map(buildQuestion);

    // Group into sections (pages) using section_id; unknown/null section grouped under 0
    const bySection = new Map<number, any[]>();
    for (const m of maps) {
      const sid = m.section_id ?? 0;
      const arr = bySection.get(sid) ?? [];
      arr.push(buildQuestion(m));
      bySection.set(sid, arr);
    }
    const sections = Array.from(bySection.entries())
      .map(([sid, qs]) => {
        const ord = Math.min(...qs.map((q: any) => Number(q.order) || 0));
        return {
          id: sid === 0 ? null : sid,
          order: ord,
          title: null, // optional enhancement: load from survey_sections if available
          questions: qs,
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Resume support: if an in-progress family exists, return previous answers and next section hint
    let previousResponses: Array<{
      question_id: number;
      answer_id: number | null;
      answer_value: string | null;
      answer_text: string | null;
    }> = [];
    let progress: { family_id: number; status: string; next_section_id: number | null } | undefined;
    if (dupe && dupe.survey_status !== 'completed') {
      const famId = Number(dupe.survey_family_id);
      const existingAnswers = await this.familyAnswersRepo.find({
        where: { survey_family_id: famId as any },
      });
      const answeredSet = new Set<number>(existingAnswers.map((r) => Number(r.survey_question_id)));
      previousResponses = existingAnswers.map((r) => ({
        question_id: Number(r.survey_question_id),
        answer_id: r.answer_id,
        answer_value: r.answer_value,
        answer_text: r.answer_text,
      }));
      // Determine next section: first section with any required question unanswered
      let nextSectionId: number | null = null;
      for (const s of sections) {
        const reqQs = s.questions.filter((q) => q.required === true);
        const allReqAnswered =
          reqQs.length === 0 ? true : reqQs.every((q) => answeredSet.has(Number(q.id)));
        if (!allReqAnswered) {
          nextSectionId = s.id ?? null;
          break;
        }
      }
      progress = {
        family_id: famId,
        status: dupe.survey_status,
        next_section_id: nextSectionId,
      };
    }

    return {
      has_active: true,
      survey: {
        id: survey.survey_id,
        title: survey.survey_title,
        // Back-compat flat array
        questions: flatQuestions,
        // New: sectioned pages
        sections,
        // Prefill data for resuming
        previous_responses: previousResponses,
      },
      // v5 has assignment/trigger; for v1 facade we return a simple stub
      trigger: { id: 0, type: 'transaction' },
      progress,
    };
  }

  private async fetchLatestActiveSurveyCompat(): Promise<PublicSurvey | null> {
    // Private schema uses survey_id/survey_title; prefer query builder for deterministic ordering
    const qb = this.surveysRepo.createQueryBuilder('s');
    qb.where('s.status_id = :status', { status: 1 }).orderBy('s.survey_id', 'DESC').limit(1);
    const latest = await qb.getOne();
    return latest ?? null;
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
    }

    // Upsert/resolve a family record allowing staged completion
    const existing = await this.familiesRepo.findOne({
      where: {
        survey_id: params.dto.survey_id,
        linkage_type_id: 0 as any,
        linkage_type_NK: params.dto.registration_id ?? 0,
      },
      order: { date_added: 'DESC' as any },
    });

    if (existing && existing.survey_status === 'completed') {
      throw new ConflictException('Survey already submitted for this registration');
    }

    const isFinal = params.dto.is_final !== undefined ? Boolean(params.dto.is_final) : true;

    let familyId: number;
    if (existing) {
      // Update timestamps/status on existing in-progress
      await this.familiesRepo.update(
        { survey_family_id: existing.survey_family_id } as any,
        {
          survey_status: isFinal ? 'completed' : 'in_progress',
          started_at: existing.started_at ?? new Date(),
          completed_at: isFinal ? new Date() : null,
        } as any,
      );
      familyId = Number(existing.survey_family_id);
    } else {
      const created = await this.familiesRepo.save({
        survey_id: params.dto.survey_id,
        linkage_type_id: 0, // registration linkage type placeholder
        linkage_type_NK: params.dto.registration_id ?? 0,
        survey_status: isFinal ? 'completed' : 'in_progress',
        started_at: new Date(),
        completed_at: isFinal ? new Date() : null,
        status_id: 1,
      } as any);
      familyId = Number(created.survey_family_id);
    }

    if (params.dto.responses?.length) {
      // Build rows with validation/mapping for multiple choice answers
      const rows: Array<{
        survey_family_id: number;
        survey_question_id: number;
        answer_id: number | null;
        answer_value: string | null;
        answer_text: string | null;
      }> = [];

      for (const r of params.dto.responses) {
        const surveyQuestionId = Number(r.question_id);

        // Resolve map → library question_id
        const map = await this.questionMapRepo.findOne({
          where: { survey_question_id: surveyQuestionId },
        });
        if (!map) {
          throw new NotFoundException(`Survey question ${surveyQuestionId} not found`);
        }

        let answerId: number | null = null;
        let answerValue: string | null = null;
        let answerText: string | null = null;

        // If answer_id provided, validate it belongs to this question_id
        if (typeof (r as any).answer_id === 'number') {
          const a = await this.answersLibRepo.findOne({
            where: {
              answer_id: (r as any).answer_id,
              question_id: map.question_id,
              status_id: 1 as any,
            },
          });
          if (!a) {
            throw new NotFoundException(
              `answer_id ${(r as any).answer_id} not valid for question_id ${map.question_id}`,
            );
          }
          answerId = Number(a.answer_id);
          // Prefer explicit answer_value from request, else library's coded value (can be NULL)
          answerValue =
            typeof (r as any).answer_value === 'string' && (r as any).answer_value.length > 0
              ? (r as any).answer_value
              : (a.answer_value ?? null);
        } else {
          // Free text / numeric / scale: take provided answer_value (string) if any
          if (typeof (r as any).answer_value === 'string' && (r as any).answer_value.length > 0) {
            answerValue = (r as any).answer_value;
          } else {
            answerValue = null;
          }
        }

        // Optional supplemental text
        if (typeof (r as any).answer_text === 'string' && (r as any).answer_text.length > 0) {
          answerText = (r as any).answer_text;
        }

        // At least one of answer_id, answer_value, answer_text should be present
        if (answerId === null && answerValue === null && answerText === null) {
          throw new ConflictException(
            `No response provided for survey_question_id ${surveyQuestionId}`,
          );
        }

        // Replace any prior answer for this question/family to support staged edits
        await this.familyAnswersRepo.delete({
          survey_family_id: familyId as any,
          survey_question_id: surveyQuestionId as any,
        } as any);

        rows.push({
          survey_family_id: familyId,
          survey_question_id: surveyQuestionId,
          answer_id: answerId,
          answer_value: answerValue,
          answer_text: answerText,
        });
      }

      await this.familyAnswersRepo.insert(rows as any);
    }

    return {
      id: familyId,
      survey_id: params.dto.survey_id,
      trigger_id: params.dto.trigger_id,
      registration_id: params.dto.registration_id ?? null,
      status: isFinal ? 'completed' : 'in_progress',
      section_id: params.dto.section_id ?? null,
    };
  }
}
