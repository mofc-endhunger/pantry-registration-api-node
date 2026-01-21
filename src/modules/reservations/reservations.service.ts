/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Registration } from '../../entities/registration.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';
import { Authentication } from '../../entities/authentication.entity';
import { PublicScheduleService } from '../public-schedule/public-schedule.service';

type AuthUser = {
  authType?: string;
  dbUserId?: number;
  userId?: string;
  id?: string;
  email?: string;
  username?: string;
};

type ListParams = {
  user: AuthUser;
  guestToken?: string;
  type?: 'upcoming' | 'past' | 'all';
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Registration) private readonly regsRepo: Repository<Registration>,
    @InjectRepository(EventTimeslot) private readonly timesRepo: Repository<EventTimeslot>,
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

  private coerceDateOnly(d: Date | null | undefined): string | null {
    if (!d) return null;
    try {
      const iso = new Date(d).toISOString();
      return iso.slice(0, 10);
    } catch {
      return null;
    }
  }

  async listForMe(params: ListParams) {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    const household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) throw new ForbiddenException('Household not resolved');

    // Build base query for user's reservations
    const qb = this.regsRepo
      .createQueryBuilder('r')
      .where('r.household_id = :household_id', { household_id })
      .andWhere("r.status IN ('confirmed','checked_in')"); // local-only visible states

    // Fetch without time-based filters; we'll compute using public dates where available
    qb.orderBy('r.created_at', 'DESC').limit(limit).offset(offset);

    const rows = await qb.getRawAndEntities();

    // Compute date ISO using public IDs
    const todayIso = new Date().toISOString().slice(0, 10);
    const computeDateIso = async (r: Registration): Promise<string | null> => {
      if ((r as any).public_event_date_id) {
        return this.publicSchedule.getDateIsoForDateId((r as any).public_event_date_id as number);
      }
      if ((r as any).public_event_slot_id) {
        return this.publicSchedule.getDateIsoForSlotId((r as any).public_event_slot_id as number);
      }
      return null;
    };

    // Resolve dates for all rows (batch sequentially; typical counts are small)
    const withDates = await Promise.all(
      rows.entities.map(async (r) => ({ r, dateIso: await computeDateIso(r) })),
    );

    // Apply client filters using computed dateIso
    const inRange = (d: string | null): boolean => {
      if (!d) return params.fromDate == null && params.toDate == null;
      if (params.fromDate && d < params.fromDate) return false;
      if (params.toDate && d > params.toDate) return false;
      return true;
    };
    const byType = (d: string | null): boolean => {
      const type = params.type ?? 'all';
      if (type === 'all') return true;
      if (!d) return false;
      return type === 'upcoming' ? d >= todayIso : d < todayIso;
    };

    const filtered = withDates.filter(({ dateIso }) => inRange(dateIso) && byType(dateIso));

    // Counts for upcoming/past across same date window
    const baseWindow = withDates.filter(({ dateIso }) => inRange(dateIso));
    const upcomingCount = baseWindow.filter(
      ({ dateIso }) => dateIso != null && dateIso >= todayIso,
    ).length;
    const pastCount = baseWindow.filter(
      ({ dateIso }) => dateIso != null && dateIso < todayIso,
    ).length;
    const total = filtered.length;

    // Map entities to read model
    // Sort by date desc then created_at desc
    filtered.sort((a, b) => {
      if (a.dateIso && b.dateIso) return b.dateIso.localeCompare(a.dateIso);
      if (a.dateIso) return -1;
      if (b.dateIso) return 1;
      return new Date(b.r.created_at).getTime() - new Date(a.r.created_at).getTime();
    });
    const page = filtered.slice(0, limit); // basic paging since qb already limited

    // Resolve times using public IDs first, else local; also fallback event name from public
    const reservations = await Promise.all(
      page.map(async ({ r, dateIso }) => {
        let startTime: string | null = null;
        let endTime: string | null = null;
        let eventName: string | undefined = undefined;
        if ((r as any).public_event_slot_id) {
          const t = await this.publicSchedule.getTimesForSlotId(
            (r as any).public_event_slot_id as number,
          );
          startTime = t.start_time;
          endTime = t.end_time;
          if (!eventName) {
            const n = await this.publicSchedule.getEventNameForSlotId(
              (r as any).public_event_slot_id as number,
            );
            eventName = n ?? undefined;
          }
        } else if ((r as any).public_event_date_id) {
          const t = await this.publicSchedule.getTimesForDateId(
            (r as any).public_event_date_id as number,
          );
          startTime = t.start_time;
          endTime = t.end_time;
          if (!eventName) {
            const n = await this.publicSchedule.getEventNameForDateId(
              (r as any).public_event_date_id as number,
            );
            eventName = n ?? undefined;
          }
        }
        return {
          id: r.id,
          event: {
            id: r.event_id,
            name: eventName,
          },
          date: dateIso,
          timeslot:
            (r as any).timeslot_id ||
            (r as any).public_event_slot_id ||
            (r as any).public_event_date_id
              ? {
                  id: (r as any).timeslot_id ?? null,
                  start_time: startTime,
                  end_time: endTime,
                }
              : null,
          public_event_slot_id: (r as any).public_event_slot_id ?? null,
          public_event_date_id: (r as any).public_event_date_id ?? null,
          household_id: r.household_id,
          created_at: r.created_at.toISOString(),
          updated_at: r.updated_at.toISOString(),
        };
      }),
    );

    return {
      reservations,
      total,
      upcoming_count: upcomingCount,
      past_count: pastCount,
    };
  }

  async getOne(params: { user: AuthUser; guestToken?: string; id: number }) {
    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    const household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) throw new ForbiddenException('Household not resolved');

    const r = await this.regsRepo.findOne({ where: { id: params.id } });
    if (!r) throw new NotFoundException('Reservation not found');
    if (String(r.household_id) !== String(household_id)) throw new ForbiddenException();

    const dateIso = (r as any).public_event_date_id
      ? await this.publicSchedule.getDateIsoForDateId((r as any).public_event_date_id as number)
      : (r as any).public_event_slot_id
        ? await this.publicSchedule.getDateIsoForSlotId((r as any).public_event_slot_id as number)
        : null;

    // Resolve times similar to list
    let startTime: string | null = null;
    let endTime: string | null = null;
    if ((r as any).public_event_slot_id) {
      const t = await this.publicSchedule.getTimesForSlotId(
        (r as any).public_event_slot_id as number,
      );
      startTime = t.start_time;
      endTime = t.end_time;
    } else if ((r as any).public_event_date_id) {
      const t = await this.publicSchedule.getTimesForDateId(
        (r as any).public_event_date_id as number,
      );
      startTime = t.start_time;
      endTime = t.end_time;
    }

    // Fallback event name from public schema if local missing
    let eventName: string | undefined = undefined;
    if (!eventName) {
      if ((r as any).public_event_slot_id) {
        const n = await this.publicSchedule.getEventNameForSlotId(
          (r as any).public_event_slot_id as number,
        );
        eventName = n ?? undefined;
      } else if ((r as any).public_event_date_id) {
        const n = await this.publicSchedule.getEventNameForDateId(
          (r as any).public_event_date_id as number,
        );
        eventName = n ?? undefined;
      }
    }

    return {
      reservation: {
        id: r.id,
        event: {
          id: r.event_id,
          name: eventName,
        },
        date: dateIso,
        timeslot:
          (r as any).timeslot_id ||
          (r as any).public_event_slot_id ||
          (r as any).public_event_date_id
            ? {
                id: r.timeslot_id ?? null,
                start_time: startTime,
                end_time: endTime,
              }
            : null,
        public_event_slot_id: r.public_event_slot_id ?? null,
        public_event_date_id: r.public_event_date_id ?? null,
        household_id: r.household_id,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
      },
    };
  }
}
