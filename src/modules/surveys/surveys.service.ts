/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../../entities/forms.entity';
import { Question } from '../../entities/questions.entity';
import { AnswerOption } from '../../entities/answer-options.entity';
import { FormAssignment } from '../../entities/form-assignments.entity';
import { SurveyTrigger } from '../../entities/survey-triggers.entity';
import { FormSubmission } from '../../entities/form-submissions.entity';
import { FormResponse } from '../../entities/form-responses.entity';
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
    @InjectRepository(Form) private readonly formsRepo: Repository<Form>,
    @InjectRepository(Question) private readonly questionsRepo: Repository<Question>,
    @InjectRepository(AnswerOption) private readonly optionsRepo: Repository<AnswerOption>,
    @InjectRepository(FormAssignment) private readonly assignmentsRepo: Repository<FormAssignment>,
    @InjectRepository(SurveyTrigger) private readonly triggersRepo: Repository<SurveyTrigger>,
    @InjectRepository(FormSubmission) private readonly submissionsRepo: Repository<FormSubmission>,
    @InjectRepository(FormResponse) private readonly responsesRepo: Repository<FormResponse>,
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
    let form: Form | null = null;
    let trigger: SurveyTrigger | null = null;

    if (params.registrationId) {
      await this.assertRegistrationOwnership(params.registrationId, dbUserId);
      // Simple strategy: latest active form assigned at "event" hierarchy (fallback to any active form)
      // This is a placeholder until assignment data exists.
      form =
        (await this.formsRepo.findOne({ where: { status_id: 1 }, order: { id: 'DESC' as any } })) ??
        null;
      trigger =
        (await this.triggersRepo.findOne({
          where: { trigger_type: 'transactional' as any },
          order: { id: 'DESC' as any },
        })) ?? null;
    } else {
      // No context → no active survey
      return { has_active: false };
    }

    if (!form || !trigger) return { has_active: false };

    // Prevent duplicates for v1 transactional
    const already = await this.submissionsRepo.findOne({
      where: {
        registration_id: params.registrationId,
        form_id: form.id,
        trigger_id: trigger.id,
      },
    });
    if (already) return { has_active: false };

    const questions = await this.questionsRepo.find();
    const options = await this.optionsRepo.find();
    const byQuestion = new Map<number, AnswerOption[]>();
    options.forEach((o) => {
      const arr = byQuestion.get(o.question_id) ?? [];
      arr.push(o);
      byQuestion.set(o.question_id, arr);
    });
    return {
      has_active: true,
      form: {
        id: form.id,
        title: form.title,
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: (byQuestion.get(q.id) ?? []).map((o) => ({
            id: o.id,
            value: o.value,
            label: o.label,
            order: o.display_order,
          })),
        })),
      },
      trigger: { id: trigger.id, type: trigger.trigger_type },
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
      // Prevent duplicates
      const dupe = await this.submissionsRepo.findOne({
        where: {
          registration_id: params.dto.registration_id,
          form_id: params.dto.form_id,
          trigger_id: params.dto.trigger_id,
        },
      });
      if (dupe) throw new ConflictException('Survey already submitted for this registration');
    }

    const date_key = this.toDateKey(regDateIso);
    const time_key = this.toTimeKey();
    const submission = await this.submissionsRepo.save({
      form_id: params.dto.form_id,
      trigger_id: params.dto.trigger_id,
      registration_id: params.dto.registration_id ?? null,
      user_id: dbUserId,
      overall_rating: params.dto.overall_rating ?? null,
      comments: params.dto.comments ?? null,
      date_key,
      time_key,
      ip_address: params.meta?.ip ? Buffer.from(params.meta.ip) : null,
      status_id: 17,
    } as any);
    const submissionId = Number(submission.id);

    if (params.dto.responses?.length) {
      const rows = params.dto.responses.map((r) => ({
        submission_id: submissionId,
        question_id: r.question_id,
        answer_value: r.answer_value,
      }));
      await this.responsesRepo.insert(rows as any);
    }

    return {
      id: submissionId,
      form_id: params.dto.form_id,
      trigger_id: params.dto.trigger_id,
      registration_id: params.dto.registration_id ?? null,
      date_key,
      time_key,
    };
  }
}
