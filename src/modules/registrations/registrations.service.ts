/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../../entities/registration.entity';
import { RegistrationAttendee } from '../../entities/registration-attendee.entity';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { UsersService } from '../users/users.service';
import { PantryTrakClient } from '../integrations/pantrytrak.client';
import { HouseholdsService } from '../households/households.service';
import { User } from '../../entities/user.entity';
import { SafeRandom } from '../../common/utils/safe-random';
import { RegistrantDto } from './dto/register.dto';
import { mapSuffixToId } from '../../common/utils/suffix-mapping';
type AuthUser = {
  authType?: string;
  dbUserId?: number;
  userId?: string;
  id?: string;
  email?: string;
  username?: string;
  roles?: string[];
};
import { CheckInDto } from './dto/check-in.dto';
import { CheckInAudit } from '../../entities/checkin-audit.entity';
import { PublicScheduleService } from '../public-schedule/public-schedule.service';
import { Authentication } from '../../entities/authentication.entity';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { PublicSurvey } from '../../entities-public/survey.public.entity';
import { PublicSurveyQuestionMap } from '../../entities-public/survey-question-map.public.entity';
import { isSurveyActionable } from '../../common/utils/survey-actionable';
import { CognitoService } from '../auth/cognito.service';
import { FEEDBACK_SURVEY_TYPE_ID } from '../../common/constants/survey.constants';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration) private readonly regsRepo: Repository<Registration>,
    @InjectRepository(RegistrationAttendee)
    private readonly attendeesRepo: Repository<RegistrationAttendee>,
    @InjectRepository(EventTimeslot) private readonly timesRepo: Repository<EventTimeslot>,
    @InjectRepository(CheckInAudit) private readonly checkinsRepo: Repository<CheckInAudit>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SurveyFamily) private readonly familiesRepo: Repository<SurveyFamily>,
    @InjectRepository(PublicSurvey) private readonly surveysRepo: Repository<PublicSurvey>,
    @InjectRepository(PublicSurveyQuestionMap)
    private readonly questionMapRepo: Repository<PublicSurveyQuestionMap>,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly publicSchedule: PublicScheduleService,
    @Optional() @InjectRepository(Event) private readonly eventsRepo?: Repository<Event>,
    @Optional() private readonly pantryTrakClient?: PantryTrakClient,
    @Optional() private readonly cognitoService?: CognitoService,
  ) {}

  /**
   * Resolve a real email for a Cognito user.  Tries the JWT claim first, then
   * falls back to an AdminGetUser call.  Returns `${sub}@auto.local` only as
   * an absolute last resort so the caller can always create a user record.
   */
  private async resolveEmail(jwtEmail: string | undefined, sub: string): Promise<string> {
    if (jwtEmail) return jwtEmail;
    if (this.cognitoService) {
      const looked = await this.cognitoService.getEmailBySub(sub);
      if (looked) return looked;
    }
    return `${sub}@auto.local`;
  }

  /**
   * After finding an existing DB user, heal any `@auto.local` email that was
   * persisted during an earlier session where the real email was unavailable.
   */
  private async healEmailIfNeeded(dbUserId: number, sub: string): Promise<void> {
    if (!this.cognitoService) return;
    try {
      const realEmail = await this.cognitoService.getEmailBySub(sub);
      if (realEmail) {
        await this.usersService.healAutoLocalEmail(dbUserId, realEmail);
      }
    } catch {
      // non-critical — don't block the request
    }
  }

  private get surveyRepos() {
    return { surveysRepo: this.surveysRepo, questionMapRepo: this.questionMapRepo };
  }

  async listForEvent(eventId: number) {
    return this.regsRepo.find({ where: { event_id: eventId } });
  }

  async listForMe(user: AuthUser, guestToken?: string) {
    // Resolve dbUserId similarly to registration flow
    let dbUserId: number | null = null;
    if (guestToken) {
      // result comes from Repository; cast intentionally
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const auth = await this.authRepo.findOne({ where: { token: guestToken } });
      dbUserId = auth ? (auth.user_id as unknown as number) : null;
    } else if (user?.authType === 'guest' && typeof user.dbUserId === 'number') {
      dbUserId = user.dbUserId;
    } else {
      const sub = (user?.userId as string) ?? (user?.id as string);
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        dbUserId = await this.usersService.findDbUserIdByCognitoUuid(sub);
      } catch {
        dbUserId = null;
      }
      if (dbUserId) {
        void this.healEmailIfNeeded(dbUserId, sub);
      } else {
        const resolvedEmail = await this.resolveEmail((user?.email as string) || undefined, sub);
        const username: string | undefined = (user?.username as string) || undefined;
        const created = await this.usersService.create({
          email: resolvedEmail,
          first_name: username ?? undefined,
          last_name: undefined,
          date_of_birth: undefined as any,
          user_type: 'customer',
          cognito_uuid: sub,
        } as any);
        dbUserId = created.user.id;
      }
    }
    if (!dbUserId) throw new ForbiddenException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) throw new ForbiddenException('Household not resolved');

    const regs = await this.regsRepo.find({
      where: [
        { household_id, status: 'confirmed' } as any,
        { household_id, status: 'waitlisted' } as any,
        { household_id, status: 'checked_in' } as any,
      ],
      order: { created_at: 'DESC' } as any,
    });

    const withSurvey = await Promise.all(
      regs.map(async (r) => {
        try {
          const fam =
            (await this.familiesRepo.findOne({
              where: { linkage_type_NK: Number(r.id) },
              order: { date_added: 'DESC' },
            })) ??
            (await this.familiesRepo.findOne({
              where: { family_id: r.household_id },
              order: { date_added: 'DESC' },
            }));
          if (!fam) return { ...r, survey: null };
          if (!(await isSurveyActionable(fam, this.surveyRepos))) return { ...r, survey: null };
          return {
            ...r,
            survey: {
              id: fam.survey_id,
              status: fam.survey_status,
            },
          };
        } catch {
          return { ...r, survey: null };
        }
      }),
    );

    return withSurvey;
  }

  async registerForEvent(
    user: AuthUser,
    dto: {
      event_id: number;
      timeslot_id?: number;
      attendees?: number[];
      event_slot_id?: number;
      event_date_id?: number;
      registrant?: RegistrantDto;
    },
    guestToken?: string,
  ) {
    // Do not validate against private events table; real DB does not have it.
    if (dto.timeslot_id) {
      const timeslot = await this.timesRepo.findOne({
        where: { id: dto.timeslot_id, event_id: dto.event_id, is_active: true },
      });
      if (!timeslot) throw new NotFoundException('Timeslot not found');
    }
    // Validate event existence using public (or legacy local eventsRepo if available) when no slot/date/timeslot provided
    if (!dto.timeslot_id && !dto.event_slot_id && !dto.event_date_id) {
      if (this.eventsRepo) {
        const byActive = await this.eventsRepo.findOne({
          where: { id: dto.event_id, is_active: true } as any,
        });
        if (!byActive) {
          const byId = await this.eventsRepo.findOne({ where: { id: dto.event_id } as any });
          if (!byId) throw new NotFoundException('Event not found');
        }
      } else if (typeof (this.publicSchedule as any).eventExists === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const exists = await (this.publicSchedule as any).eventExists(dto.event_id);
        if (!exists) throw new NotFoundException('Event not found');
      }
    }

    // --- Case manager "register on behalf of" flow ---
    if (dto.registrant) {
      const roles: string[] = user?.roles ?? [];
      if (!roles.includes('case_managers')) {
        throw new ForbiddenException('Only case managers may register on behalf of another person');
      }
      return this.registerOnBehalfOf(user, dto, dto.registrant);
    }

    // Resolve household (prefer explicit guest token if provided)
    let dbUserId: number | null = null;
    if (guestToken) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const auth = await this.authRepo.findOne({ where: { token: guestToken } });
      dbUserId = auth ? (auth.user_id as unknown as number) : null;
    } else if (user?.authType === 'guest' && typeof user.dbUserId === 'number') {
      dbUserId = user.dbUserId;
    } else {
      const sub = (user?.userId as string) ?? (user?.id as string);
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        dbUserId = await this.usersService.findDbUserIdByCognitoUuid(sub);
      } catch {
        dbUserId = null;
      }
      if (dbUserId) {
        void this.healEmailIfNeeded(dbUserId, sub);
      } else {
        const resolvedEmail = await this.resolveEmail((user?.email as string) || undefined, sub);
        const username: string | undefined = (user?.username as string) || undefined;
        const created = await this.usersService.create({
          email: resolvedEmail,
          first_name: username ?? undefined,
          last_name: undefined,
          date_of_birth: undefined as any,
          user_type: 'customer',
          cognito_uuid: sub,
        } as any);
        dbUserId = created.user.id;
      }
    }
    if (!dbUserId) throw new ForbiddenException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) {
      // Auto-create a minimal household for this user (guest-first flow)
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const userEntity = await this.usersService.findById(dbUserId);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        await this.householdsService.createHousehold(dbUserId, {
          primary_first_name: userEntity.first_name || 'Guest',
          primary_last_name: userEntity.last_name || 'User',
          primary_date_of_birth: (userEntity.date_of_birth as unknown as string) || '1900-01-01',
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);

        // Best-effort: sync gender_id and suffix_id from user to HOH member
        try {
          if (household_id) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const members = await this.householdsService.listMembers(household_id, dbUserId);
            const hoh = Array.isArray(members)
              ? (
                  members as Array<{
                    id: number;
                    is_head_of_household?: boolean;
                    gender_id?: number | null;
                    suffix_id?: number | null;
                  }>
                ).find((m) => !!m.is_head_of_household)
              : undefined;
            if (hoh) {
              const patch: Record<string, number> = {};

              if (hoh.gender_id == null || Number.isNaN(hoh.gender_id)) {
                const g = (userEntity.gender || '').toString().trim().toLowerCase();
                const mappedGenderId = g === 'male' ? 1 : g === 'female' ? 2 : undefined;
                if (mappedGenderId !== undefined) patch.gender_id = mappedGenderId;
              }

              if (hoh.suffix_id == null) {
                const mappedSuffixId = mapSuffixToId(userEntity.suffix);
                if (mappedSuffixId !== undefined) patch.suffix_id = mappedSuffixId;
              }

              if (Object.keys(patch).length > 0) {
                await this.householdsService.updateMember(
                  household_id,
                  hoh.id,
                  dbUserId,
                  patch as any,
                );
              }
            }
          }
        } catch {
          // ignore member sync failures
        }
      } catch {
        // ignore and fall through to error
      }
    }
    if (!household_id) throw new ForbiddenException('Household not resolved');

    // If household counts were provided as part of registration (common for first-time Cognito users),
    // materialize additional household members to match the requested counts and update snapshot counts.
    try {
      // Normalize possible field names from UI
      const toInt = (v: unknown) => {
        if (v === undefined || v === null || v === '') return 0;
        const n = typeof v === 'string' ? Number(v) : (v as number);
        return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
      };
      const desiredSeniors = toInt(
        (dto as any)?.counts?.seniors ??
          (dto as any)?.counts?.seniors_count ??
          (dto as any)?.counts?.synth_seniors ??
          (dto as any).seniors ??
          (dto as any).seniors_in_household ??
          (dto as any).seniors_count,
      );
      const desiredAdults = toInt(
        (dto as any)?.counts?.adults ??
          (dto as any)?.counts?.adults_count ??
          (dto as any)?.counts?.synth_adults ??
          (dto as any).adults ??
          (dto as any).adults_in_household ??
          (dto as any).adults_count,
      );
      const desiredChildren = toInt(
        (dto as any)?.counts?.children ??
          (dto as any)?.counts?.children_count ??
          (dto as any)?.counts?.synth_children ??
          (dto as any).children ??
          (dto as any).children_in_household ??
          (dto as any).children_count,
      );
      let hasAnyCount = (desiredSeniors ?? 0) + (desiredAdults ?? 0) + (desiredChildren ?? 0) > 0;

      // intentionally no-op: count resolution handled below

      if (!hasAnyCount) {
        // Fallback: if registration payload omitted counts, use user's snapshot counts
        try {
          const userEntity = await this.usersService.findById(dbUserId);
          const snapS = toInt((userEntity as any).seniors_in_household);
          const snapA = toInt((userEntity as any).adults_in_household);
          const snapC = toInt((userEntity as any).children_in_household);
          const hasSnap = snapS + snapA + snapC > 0;
          if (hasSnap) {
            hasAnyCount = true;
            // Convert snapshot (inclusive of HOH) to exclusive counts by subtracting HOH category
            const computeAge = (dob?: string | null): number | null => {
              if (!dob) return null;
              const d = new Date(dob);
              if (Number.isNaN(d.getTime())) return null;
              const now = new Date();
              let age = now.getFullYear() - d.getFullYear();
              const mDiff = now.getMonth() - d.getMonth();
              if (mDiff < 0 || (mDiff === 0 && now.getDate() < d.getDate())) age--;
              return age;
            };
            const hohDob = (userEntity as any).date_of_birth as string | null;
            const hohAge = computeAge(hohDob);
            let exclS = snapS;
            let exclA = snapA;
            let exclC = snapC;
            if (hohAge == null) {
              exclA = Math.max(0, snapA - 1);
            } else if (hohAge >= 60) {
              exclS = Math.max(0, snapS - 1);
            } else if (hohAge < 18) {
              exclC = Math.max(0, snapC - 1);
            } else {
              exclA = Math.max(0, snapA - 1);
            }
            await this.usersService.updateUserWithHousehold(dbUserId, {
              household_id: household_id,
              seniors_in_household: exclS,
              adults_in_household: exclA,
              children_in_household: exclC,
            } as any);
          }
        } catch (e) {
          console.warn(
            '[registerForEvent] Snapshot fallback failed',
            e instanceof Error ? e.message : String(e),
          );
        }
      }

      if (hasAnyCount) {
        await this.usersService.updateUserWithHousehold(dbUserId, {
          household_id: household_id,
          seniors_in_household: desiredSeniors,
          adults_in_household: desiredAdults,
          children_in_household: desiredChildren,
        } as any);
      }
    } catch (err) {
      // best-effort; continue on failure but log the error
      console.error(
        '[registerForEvent] Failed to update household counts during registration:',
        err,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const whereConditions = dto.event_date_id
      ? [
          {
            event_id: dto.event_id,
            public_event_date_id: dto.event_date_id,
            household_id,
            status: 'confirmed',
          } as any,
          {
            event_id: dto.event_id,
            public_event_date_id: dto.event_date_id,
            household_id,
            status: 'waitlisted',
          } as any,
          {
            event_id: dto.event_id,
            public_event_date_id: dto.event_date_id,
            household_id,
            status: 'checked_in',
          } as any,
        ]
      : [
          { event_id: dto.event_id, household_id, status: 'confirmed' } as any,
          { event_id: dto.event_id, household_id, status: 'waitlisted' } as any,
          { event_id: dto.event_id, household_id, status: 'checked_in' } as any,
        ];

    const existing = await this.regsRepo.findOne({
      where: whereConditions,
    });
    if (existing) throw new BadRequestException('Already registered');

    // Capacity check
    let capacity: number | null = null;
    let confirmedCount = 0;
    if (dto.event_slot_id) {
      const slot = await this.publicSchedule.getSlot(dto.event_slot_id);
      capacity = slot?.capacity ?? null;
      if (slot && slot.capacity !== null && (slot.reserved ?? 0) >= (slot.capacity ?? 0)) {
        // Mark as full → will create waitlisted registration (no counters incremented)
        confirmedCount = slot.capacity ?? 0;
      }
    } else if (dto.timeslot_id) {
      const timeslot = await this.timesRepo.findOne({ where: { id: dto.timeslot_id } });
      capacity = timeslot?.capacity ?? null;
      confirmedCount = await this.regsRepo.count({
        where: { timeslot_id: dto.event_slot_id, status: 'confirmed' } as any,
      });
    } else if (dto.event_date_id) {
      const date = await this.publicSchedule.getDate(dto.event_date_id);
      capacity = date?.capacity ?? null;
      if (date && date.capacity !== null && (date.reserved ?? 0) >= (date.capacity ?? 0)) {
        // Mark as full → will create waitlisted registration
        confirmedCount = date.capacity ?? 0;
      }
    } else {
      // No public slot/date or local timeslot provided — treat capacity as unbounded
      capacity = null;
      confirmedCount = await this.regsRepo.count({
        where: { event_id: dto.event_id, status: 'confirmed', timeslot_id: null } as any,
      });
    }
    const hasCapacity = capacity == null || confirmedCount < capacity;

    const reg = this.regsRepo.create({
      event_id: dto.event_id,
      household_id,
      timeslot_id: dto.timeslot_id ?? null,
      status: hasCapacity ? 'confirmed' : 'waitlisted',
      created_by: dbUserId,
      public_event_slot_id: dto.event_slot_id ?? null,
      public_event_date_id: dto.event_date_id ?? null,
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const savedOrArray = await this.regsRepo.save(reg);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const saved: Registration = Array.isArray(savedOrArray)
      ? savedOrArray[0]
      : (savedOrArray as Registration);
    if (Array.isArray(dto.attendees) && dto.attendees.length) {
      for (const memberId of dto.attendees) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const attendee = this.attendeesRepo.create({
          registration_id: saved.id,
          household_member_id: memberId,
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        await this.attendeesRepo.save(attendee);
      }
    }
    // Update public counters after success
    if (hasCapacity) {
      if (dto.event_slot_id) await this.publicSchedule.incrementSlotAndDate(dto.event_slot_id);
      else if (dto.event_date_id) await this.publicSchedule.incrementDate(dto.event_date_id);
    }
    // Best-effort sync to PantryTrak (fire-and-forget)
    try {
      if (this.pantryTrakClient) {
        this.pantryTrakClient
          .createReservation({
            id: saved.id,
            user_id: saved.created_by as unknown as number,
            event_date_id: saved.public_event_date_id ?? saved.event_id,
            event_slot_id: saved.public_event_slot_id ?? null,
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            // eslint-disable-next-line no-console
            console.warn('[PantryTrak] createReservation failed', msg);
          });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn('[PantryTrak] client not available', msg);
    }

    // Auto-assign survey family (best-effort; non-blocking)
    try {
      await this.autoAssignSurveyForRegistration(saved);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Surveys] auto-assign failed', e instanceof Error ? e.message : String(e));
    }

    return saved;
  }

  async findByCreatedBy(
    user: AuthUser,
    query: {
      event_id?: number;
      status?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
    },
  ) {
    const sub = (user?.userId as string) ?? (user?.id as string);
    let dbUserId: number | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dbUserId = await this.usersService.findDbUserIdByCognitoUuid(sub);
    } catch {
      dbUserId = null;
    }
    if (!dbUserId) throw new ForbiddenException('User not found');

    // Exclude the CM's own household so self-registrations don't appear
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cmHouseholdId = await this.householdsService.findHouseholdIdByUserId(dbUserId);

    const qb = this.regsRepo
      .createQueryBuilder('reg')
      .leftJoin(
        'household_members',
        'hm',
        'hm.household_id = reg.household_id AND hm.is_head_of_household = 1',
      )
      .leftJoin('users', 'u', 'u.id = hm.user_id')
      .select([
        'reg.id AS id',
        'reg.event_id AS event_id',
        'reg.household_id AS household_id',
        'reg.status AS status',
        'reg.created_by AS created_by',
        'reg.public_event_date_id AS event_date_id',
        'reg.public_event_slot_id AS event_slot_id',
        'reg.created_at AS created_at',
        'u.first_name AS registrant_first_name',
        'u.last_name AS registrant_last_name',
        'u.phone AS registrant_phone',
        'u.email AS registrant_email',
      ])
      .where('reg.created_by = :cmId', { cmId: dbUserId })
      .orderBy('reg.created_at', 'DESC')
      .take(query.limit ?? 50);

    if (cmHouseholdId) {
      qb.andWhere('reg.household_id != :cmHhId', { cmHhId: cmHouseholdId });
    }

    if (query.event_id) {
      qb.andWhere('reg.event_id = :eventId', { eventId: query.event_id });
    }
    if (query.status) {
      qb.andWhere('reg.status = :status', { status: query.status });
    }
    if (query.from_date) {
      qb.andWhere('reg.created_at >= :from', { from: new Date(query.from_date) });
    }
    if (query.to_date) {
      qb.andWhere('reg.created_at <= :to', { to: new Date(query.to_date) });
    }

    const rows = await qb.getRawMany();

    // Resolve event names and dates from the public database (freshtrak_public).
    // Uses a retry to handle cold connection-pool scenarios where the first
    // query against the public DataSource fails transiently.
    const dateIds = [
      ...new Set(rows.map((r: any) => Number(r.event_date_id)).filter((id) => id > 0)),
    ];
    const eventNameMap = new Map<number, string>();
    const eventDateIsoMap = new Map<number, string>();

    const resolveWithRetry = async <T>(
      fn: (id: number) => Promise<T | null>,
      id: number,
    ): Promise<T | null> => {
      try {
        return await fn(id);
      } catch {
        // Single retry after a short delay to handle cold-pool / transient failures
        try {
          await new Promise((r) => setTimeout(r, 150));
          return await fn(id);
        } catch (retryErr) {
          // eslint-disable-next-line no-console
          console.warn(
            `[findByCreatedBy] Failed to resolve public data for event_date_id=${id} after retry`,
            retryErr instanceof Error ? retryErr.message : String(retryErr),
          );
          return null;
        }
      }
    };

    await Promise.all(
      dateIds.map(async (dateId) => {
        const [name, iso] = await Promise.all([
          resolveWithRetry((id) => this.publicSchedule.getEventNameForDateId(id), dateId),
          resolveWithRetry((id) => this.publicSchedule.getDateIsoForDateId(id), dateId),
        ]);
        if (name) eventNameMap.set(dateId, name);
        if (iso) eventDateIsoMap.set(dateId, iso);
      }),
    );

    return rows.map((r: any) => {
      const id = Number(r.event_date_id);
      return {
        ...r,
        event_name: id > 0 ? (eventNameMap.get(id) ?? null) : null,
        event_date: id > 0 ? (eventDateIsoMap.get(id) ?? null) : null,
      };
    });
  }

  private async generateUniqueIdentificationCode(): Promise<string> {
    let code: string;
    do {
      code = SafeRandom.generateCode(6);
    } while (await this.userRepo.findOne({ where: { identification_code: code } }));
    return code;
  }

  /**
   * Creates a new guest user + household for the registrant,
   * then registers them for the event with created_by = case manager.
   */
  private async registerOnBehalfOf(
    caseManager: AuthUser,
    dto: {
      event_id: number;
      timeslot_id?: number;
      attendees?: number[];
      event_slot_id?: number;
      event_date_id?: number;
    },
    registrant: RegistrantDto,
  ) {
    // Resolve case manager's DB user ID
    const cmSub = (caseManager?.userId as string) ?? (caseManager?.id as string);
    let cmDbUserId: number | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      cmDbUserId = await this.usersService.findDbUserIdByCognitoUuid(cmSub);
    } catch {
      cmDbUserId = null;
    }
    if (cmDbUserId) {
      void this.healEmailIfNeeded(cmDbUserId, cmSub);
    } else {
      const resolvedEmail = await this.resolveEmail(
        (caseManager?.email as string) || undefined,
        cmSub,
      );
      const username: string | undefined = (caseManager?.username as string) || undefined;
      const created = await this.usersService.create({
        email: resolvedEmail,
        first_name: username ?? undefined,
        last_name: undefined,
        date_of_birth: undefined as any,
        user_type: 'customer',
        cognito_uuid: cmSub,
      } as any);
      cmDbUserId = created.user.id;
    }
    if (!cmDbUserId) throw new ForbiddenException('Case manager user not found');

    // Create a new guest user for the registrant
    const registrantUser = this.userRepo.create({
      user_type: 'guest',
      identification_code: await this.generateUniqueIdentificationCode(),
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      suffix: registrant.suffix ?? null,
      gender: registrant.gender ?? null,
      email: registrant.email ?? null,
      date_of_birth: registrant.date_of_birth ?? null,
      phone: registrant.phone ?? null,
      address_line_1: registrant.address_line_1 ?? null,
      address_line_2: registrant.address_line_2 ?? null,
      city: registrant.city ?? null,
      state: registrant.state ?? null,
      zip_code: registrant.zip_code ?? null,
      seniors_in_household: registrant.seniors ?? 0,
      adults_in_household: registrant.adults ?? 0,
      children_in_household: registrant.children ?? 0,
    });
    await this.userRepo.save(registrantUser);

    // Sync registrant to PantryTrak immediately after creation so the user record
    // exists before the reservation is sent, regardless of household member counts.
    try {
      if (this.pantryTrakClient) {
        await this.pantryTrakClient.createUser(registrantUser);
      }
    } catch {
      // Non-blocking: PantryTrak sync failure must not prevent registration
    }

    // Create household for the registrant
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    await this.householdsService.createHousehold(registrantUser.id, {
      primary_first_name: registrant.first_name,
      primary_last_name: registrant.last_name,
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const household_id = await this.householdsService.findHouseholdIdByUserId(registrantUser.id);
    if (!household_id) throw new ForbiddenException('Failed to create household for registrant');

    // Materialize household member counts if provided
    const totalMembers =
      (registrant.seniors ?? 0) + (registrant.adults ?? 0) + (registrant.children ?? 0);
    if (totalMembers > 0) {
      try {
        await this.usersService.updateUserWithHousehold(registrantUser.id, {
          household_id,
          seniors_in_household: registrant.seniors ?? 0,
          adults_in_household: registrant.adults ?? 0,
          children_in_household: registrant.children ?? 0,
        } as any);
      } catch {
        // best-effort
      }
    }

    // Duplicate check (same event + household)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const whereConditions = dto.event_date_id
      ? [
          {
            event_id: dto.event_id,
            public_event_date_id: dto.event_date_id,
            household_id,
            status: 'confirmed',
          } as any,
          {
            event_id: dto.event_id,
            public_event_date_id: dto.event_date_id,
            household_id,
            status: 'waitlisted',
          } as any,
          {
            event_id: dto.event_id,
            public_event_date_id: dto.event_date_id,
            household_id,
            status: 'checked_in',
          } as any,
        ]
      : [
          { event_id: dto.event_id, household_id, status: 'confirmed' } as any,
          { event_id: dto.event_id, household_id, status: 'waitlisted' } as any,
          { event_id: dto.event_id, household_id, status: 'checked_in' } as any,
        ];
    const existing = await this.regsRepo.findOne({ where: whereConditions });
    if (existing) throw new BadRequestException('Already registered');

    // Capacity check
    let capacity: number | null = null;
    let confirmedCount = 0;
    if (dto.event_slot_id) {
      const slot = await this.publicSchedule.getSlot(dto.event_slot_id);
      capacity = slot?.capacity ?? null;
      if (slot && slot.capacity !== null && (slot.reserved ?? 0) >= (slot.capacity ?? 0)) {
        confirmedCount = slot.capacity ?? 0;
      }
    } else if (dto.timeslot_id) {
      const timeslot = await this.timesRepo.findOne({ where: { id: dto.timeslot_id } });
      capacity = timeslot?.capacity ?? null;
      confirmedCount = await this.regsRepo.count({
        where: { timeslot_id: dto.event_slot_id, status: 'confirmed' } as any,
      });
    } else if (dto.event_date_id) {
      const date = await this.publicSchedule.getDate(dto.event_date_id);
      capacity = date?.capacity ?? null;
      if (date && date.capacity !== null && (date.reserved ?? 0) >= (date.capacity ?? 0)) {
        confirmedCount = date.capacity ?? 0;
      }
    } else {
      capacity = null;
      confirmedCount = await this.regsRepo.count({
        where: { event_id: dto.event_id, status: 'confirmed', timeslot_id: null } as any,
      });
    }
    const hasCapacity = capacity == null || confirmedCount < capacity;

    // Create registration with created_by = case manager
    const reg = this.regsRepo.create({
      event_id: dto.event_id,
      household_id,
      timeslot_id: dto.timeslot_id ?? null,
      status: hasCapacity ? 'confirmed' : 'waitlisted',
      created_by: cmDbUserId,
      public_event_slot_id: dto.event_slot_id ?? null,
      public_event_date_id: dto.event_date_id ?? null,
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const savedOrArray = await this.regsRepo.save(reg);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const saved: Registration = Array.isArray(savedOrArray)
      ? savedOrArray[0]
      : (savedOrArray as Registration);

    if (Array.isArray(dto.attendees) && dto.attendees.length) {
      for (const memberId of dto.attendees) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const attendee = this.attendeesRepo.create({
          registration_id: saved.id,
          household_member_id: memberId,
        } as any);
        await this.attendeesRepo.save(attendee);
      }
    }

    // Update public counters
    if (hasCapacity) {
      if (dto.event_slot_id) await this.publicSchedule.incrementSlotAndDate(dto.event_slot_id);
      else if (dto.event_date_id) await this.publicSchedule.incrementDate(dto.event_date_id);
    }

    // Best-effort PantryTrak sync — use the registrant's user ID, not the case manager's
    try {
      if (this.pantryTrakClient) {
        this.pantryTrakClient
          .createReservation({
            id: saved.id,
            user_id: registrantUser.id,
            event_date_id: saved.public_event_date_id ?? saved.event_id,
            event_slot_id: saved.public_event_slot_id ?? null,
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn('[PantryTrak] createReservation failed (on-behalf-of)', msg);
          });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[PantryTrak] client not available (on-behalf-of)', msg);
    }

    // Auto-assign survey (best-effort)
    try {
      await this.autoAssignSurveyForRegistration(saved);
    } catch (e) {
      console.warn(
        '[Surveys] auto-assign failed (on-behalf-of)',
        e instanceof Error ? e.message : String(e),
      );
    }

    return saved;
  }

  async cancelRegistration(user: AuthUser, registrationId: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const reg = await this.regsRepo.findOne({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found');
    // Resolve household via JWT sub
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dbUserId =
      user?.authType === 'guest' && typeof user.dbUserId === 'number'
        ? user.dbUserId
        : await (async () => {
            try {
              return await this.usersService.findDbUserIdByCognitoUuid(
                (user?.userId as string) ?? (user?.id as string),
              );
            } catch {
              return null;
            }
          })();
    if (!dbUserId) throw new ForbiddenException('User not found');
    const household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) throw new ForbiddenException('Household not resolved');
    if (String(reg.household_id) !== String(household_id)) throw new ForbiddenException();
    if (reg.status === 'cancelled') return reg;
    reg.status = 'cancelled';
    await this.regsRepo.save(reg);

    // Promote next waitlisted registration if any
    await this.promoteFromWaitlist(reg.event_id, reg.timeslot_id ?? null);

    // Decrement public counters if present
    if (reg.public_event_slot_id)
      await this.publicSchedule.decrementSlotAndDate(reg.public_event_slot_id);
    else if (reg.public_event_date_id)
      await this.publicSchedule.decrementDate(reg.public_event_date_id);
    return reg;
  }

  private async autoAssignSurveyForRegistration(reg: Registration) {
    // Only assign for confirmed registrations
    if (reg.status !== 'confirmed') return;

    let langId = 1;
    try {
      const creator = await this.usersService.findById(reg.created_by as unknown as number);
      if (creator?.language_id && Number.isFinite(Number(creator.language_id))) {
        langId = Number(creator.language_id);
      }
    } catch {
      // ignore, keep default
    }

    const qb = this.surveysRepo.createQueryBuilder('s');
    qb.where('s.status_id = :status', { status: 1 })
      .andWhere('s.language_id = :lang', { lang: langId })
      .andWhere('s.survey_type_id = :type', { type: FEEDBACK_SURVEY_TYPE_ID })
      .orderBy('s.survey_id', 'DESC')
      .limit(1);
    const survey = await qb.getOne();
    if (!survey) return;

    // Avoid duplicate family rows for same registration/survey
    const existing = await this.familiesRepo.findOne({
      where: {
        survey_id: survey.survey_id,
        linkage_type_id: 0 as any,
        linkage_type_NK: reg.id as any,
      },
      order: { date_added: 'DESC' as any },
    });
    if (existing) return;

    // Compute display (presented_at) as end of event occurrence
    let presentedAt: Date = new Date();
    try {
      if (reg.public_event_slot_id) {
        const [dateIso, times] = await Promise.all([
          this.publicSchedule.getDateIsoForSlotId(reg.public_event_slot_id),
          this.publicSchedule.getTimesForSlotId(reg.public_event_slot_id),
        ]);
        if (dateIso) {
          const end = times?.end_time ?? '23:59:59';
          presentedAt = new Date(`${dateIso}T${end}`);
        }
      } else if (reg.public_event_date_id) {
        const [dateIso, times] = await Promise.all([
          this.publicSchedule.getDateIsoForDateId(reg.public_event_date_id),
          this.publicSchedule.getTimesForDateId(reg.public_event_date_id),
        ]);
        if (dateIso) {
          const end = times?.end_time ?? '23:59:59';
          presentedAt = new Date(`${dateIso}T${end}`);
        }
      } else if (reg.timeslot_id) {
        const t = await this.timesRepo.findOne({ where: { id: reg.timeslot_id } });
        if (t?.end_at) presentedAt = new Date(t.end_at);
      }
    } catch {
      // ignore time resolution errors; fallback to now
    }

    await this.familiesRepo.save({
      survey_id: survey.survey_id,
      family_id: reg.household_id,
      family_member_id: null,
      linkage_type_id: 0, // registration linkage
      linkage_type_NK: reg.id,
      survey_status: 'scheduled',
      presented_at: presentedAt,
      started_at: null,
      completed_at: null,
      status_id: 1,
    } as any);
  }

  async checkIn(user: AuthUser, dto: CheckInDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const reg = await this.regsRepo.findOne({ where: { id: dto.registration_id } });
    if (!reg) throw new NotFoundException('Registration not found');
    // Resolve household via JWT sub
    const checkInSub = (user?.userId as string) ?? (user?.id as string);
    let dbUserId =
      user?.authType === 'guest' && typeof user.dbUserId === 'number'
        ? user.dbUserId
        : await (async () => {
            try {
              return await this.usersService.findDbUserIdByCognitoUuid(checkInSub);
            } catch {
              return null;
            }
          })();
    if (dbUserId) {
      void this.healEmailIfNeeded(dbUserId, checkInSub);
    } else {
      const resolvedEmail = await this.resolveEmail(
        (user?.email as string) || undefined,
        checkInSub,
      );
      const username: string | undefined = (user?.username as string) || undefined;
      const created = await this.usersService.create({
        email: resolvedEmail,
        first_name: username ?? undefined,
        last_name: undefined,
        date_of_birth: undefined as any,
        user_type: 'customer',
        cognito_uuid: checkInSub,
      } as any);
      dbUserId = created.user.id;
    }
    const household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) throw new ForbiddenException('Household not resolved');
    if (String(reg.household_id) !== String(household_id)) throw new ForbiddenException();

    if (reg.status === 'cancelled')
      throw new BadRequestException('Cannot check-in a cancelled registration');
    reg.status = 'checked_in';
    await this.regsRepo.save(reg);

    // Audit
    const audit = this.checkinsRepo.create({
      registration_id: reg.id,
      created_by: dbUserId,
      attendees_count: Array.isArray(dto.attendee_ids) ? dto.attendee_ids.length : null,
    } as any);
    await this.checkinsRepo.save(audit);

    return reg;
  }

  private async promoteFromWaitlist(eventId: number, timeslotId: number | null) {
    const where: any = timeslotId
      ? { event_id: eventId, timeslot_id: timeslotId, status: 'waitlisted' }
      : { event_id: eventId, timeslot_id: null, status: 'waitlisted' };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const next = await this.regsRepo.find({ where, order: { created_at: 'ASC' }, take: 1 } as any);
    if (!next.length) return;
    const toPromote = next[0];
    toPromote.status = 'confirmed';
    await this.regsRepo.save(toPromote);
    // Best-effort: notify PantryTrak for newly-confirmed reservation promoted from waitlist
    try {
      if (this.pantryTrakClient) {
        this.pantryTrakClient
          .createReservation({
            id: toPromote.id,
            user_id: toPromote.created_by as unknown as number,
            event_date_id: toPromote.public_event_date_id ?? toPromote.event_id,
            event_slot_id: toPromote.public_event_slot_id ?? null,
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            // eslint-disable-next-line no-console
            console.warn('[PantryTrak] createReservation failed (promote)', msg);
          });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.warn('[PantryTrak] client not available (promote)', msg);
    }
  }
}
