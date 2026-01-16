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

    // Temporarily ignore date/time filters until local data is populated
    qb.orderBy('r.created_at', 'DESC').limit(limit).offset(offset);

    const rows = await qb.getRawAndEntities();

    // Total counts (filtered) and type breakdowns (across all for this household)
    const totalQb = this.regsRepo
      .createQueryBuilder('r')
      .leftJoin(Event, 'e', 'e.id = r.event_id')
      .leftJoin(EventTimeslot, 't', 't.id = r.timeslot_id')
      .where('r.household_id = :household_id', { household_id })
      .andWhere("r.status IN ('confirmed','checked_in')");

    const total = await totalQb.getCount();

    // Stub counts while time-based classification is disabled
    const upcomingCount = 0;
    const pastCount = 0;

    // Map entities to read model
    const reservations = rows.entities.map((r) => {
      // Temporarily omit time (will be restored when data is available locally)
      const startAt = null as unknown as Date | null;
      const endAt = null as unknown as Date | null;
      return {
        id: r.id,
        event: {
          id: r.event_id,
          name: (r as any).event?.name ?? undefined,
        },
        date: null,
        timeslot: r.timeslot_id
          ? {
              id: r.timeslot_id ?? null,
              start_time: null,
              end_time: null,
            }
          : null,
        public_event_slot_id: r.public_event_slot_id ?? null,
        public_event_date_id: r.public_event_date_id ?? null,
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

    // Temporarily omit time (will be restored when data is available locally)
    const startAt = null as unknown as Date | null;
    const endAt = null as unknown as Date | null;

    return {
      reservation: {
        id: r.id,
        event: {
          id: r.event_id,
          name: event?.name ?? undefined,
        },
        date: null,
        timeslot: r.timeslot_id
          ? {
              id: r.timeslot_id ?? null,
              start_time: null,
              end_time: null,
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
