/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../../entities/registration.entity';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';
import { Authentication } from '../../entities/authentication.entity';

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
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(EventTimeslot) private readonly timesRepo: Repository<EventTimeslot>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
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
    const type = params.type ?? 'all';
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const dbUserId = await this.resolveDbUserId(params.user, params.guestToken);
    const household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) throw new ForbiddenException('Household not resolved');

    // Build a query that left-joins event and timeslot to derive a sortable/filterable start_at
    const qb = this.regsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect(Event, 'e', 'e.id = r.event_id')
      .leftJoinAndSelect(EventTimeslot, 't', 't.id = r.timeslot_id')
      .where('r.household_id = :household_id', { household_id })
      .andWhere("r.status IN ('confirmed','checked_in')"); // local-only visible states

    // Compute a virtual start column = COALESCE(t.start_at, e.start_at)
    // Use raw where conditions for date filters
    if (params.fromDate) {
      qb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) >= :from) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) >= :from) )',
        { from: params.fromDate },
      );
    }
    if (params.toDate) {
      qb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) <= :to) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) <= :to) )',
        { to: params.toDate },
      );
    }
    if (type === 'upcoming') {
      qb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) >= CURRENT_DATE) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) >= CURRENT_DATE) )',
      );
    } else if (type === 'past') {
      qb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) < CURRENT_DATE) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) < CURRENT_DATE) )',
      );
    }

    qb.orderBy('COALESCE(t.start_at, e.start_at)', 'DESC').limit(limit).offset(offset);

    const rows = await qb.getRawAndEntities();

    // Total counts (filtered) and type breakdowns (across all for this household)
    const totalQb = this.regsRepo
      .createQueryBuilder('r')
      .leftJoin(Event, 'e', 'e.id = r.event_id')
      .leftJoin(EventTimeslot, 't', 't.id = r.timeslot_id')
      .where('r.household_id = :household_id', { household_id })
      .andWhere("r.status IN ('confirmed','checked_in')");

    if (params.fromDate) {
      totalQb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) >= :from) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) >= :from) )',
        { from: params.fromDate },
      );
    }
    if (params.toDate) {
      totalQb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) <= :to) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) <= :to) )',
        { to: params.toDate },
      );
    }
    if (type === 'upcoming') {
      totalQb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) >= CURRENT_DATE) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) >= CURRENT_DATE) )',
      );
    } else if (type === 'past') {
      totalQb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) < CURRENT_DATE) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) < CURRENT_DATE) )',
      );
    }
    const total = await totalQb.getCount();

    // Upcoming/past counts across all (ignoring type filter but honoring from/to)
    const baseCountQb = this.regsRepo
      .createQueryBuilder('r')
      .leftJoin(Event, 'e', 'e.id = r.event_id')
      .leftJoin(EventTimeslot, 't', 't.id = r.timeslot_id')
      .where('r.household_id = :household_id', { household_id })
      .andWhere("r.status IN ('confirmed','checked_in')");
    if (params.fromDate) {
      baseCountQb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) >= :from) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) >= :from) )',
        { from: params.fromDate },
      );
    }
    if (params.toDate) {
      baseCountQb.andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) <= :to) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) <= :to) )',
        { to: params.toDate },
      );
    }
    const upcomingCount = await baseCountQb
      .clone()
      .andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) >= CURRENT_DATE) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) >= CURRENT_DATE) )',
      )
      .getCount();
    const pastCount = await baseCountQb
      .clone()
      .andWhere(
        '( (t.start_at IS NOT NULL AND DATE(t.start_at) < CURRENT_DATE) OR (t.start_at IS NULL AND e.start_at IS NOT NULL AND DATE(e.start_at) < CURRENT_DATE) )',
      )
      .getCount();

    // Map entities to read model
    const reservations = rows.entities.map((r) => {
      // Prefer timeslot dates
      const startAt = (r as any).timeslot?.start_at ?? (r as any).event?.start_at ?? null;
      const endAt = (r as any).timeslot?.end_at ?? null;
      return {
        id: r.id,
        event: {
          id: r.event_id,
          name: (r as any).event?.name ?? undefined,
        },
        date: this.coerceDateOnly(startAt),
        timeslot: startAt
          ? {
              start_time: new Date(startAt).toISOString(),
              end_time: endAt ? new Date(endAt).toISOString() : null,
            }
          : null,
        household_id: r.household_id,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
      };
    });

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

    // Load event and timeslot for display
    const event = await this.eventsRepo.findOne({ where: { id: r.event_id } });
    const timeslot = r.timeslot_id
      ? await this.timesRepo.findOne({ where: { id: r.timeslot_id } })
      : null;

    const startAt = timeslot?.start_at ?? event?.start_at ?? null;
    const endAt = timeslot?.end_at ?? null;

    return {
      reservation: {
        id: r.id,
        event: {
          id: r.event_id,
          name: event?.name ?? undefined,
        },
        date: this.coerceDateOnly(startAt),
        timeslot: startAt
          ? {
              start_time: new Date(startAt).toISOString(),
              end_time: endAt ? new Date(endAt).toISOString() : null,
            }
          : null,
        household_id: r.household_id,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
      },
    };
  }
}
