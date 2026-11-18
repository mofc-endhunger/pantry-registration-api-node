/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { slotFullException } from '../../common/utils/slot-full';
import { PublicEventSlot } from '../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../entities-public/event-date.public.entity';
import { PublicEvent } from '../../entities-public/event.public.entity';
import { PublicDimTime } from '../../entities-public/dim-time.public.entity';
import { PublicEventHour } from '../../entities-public/event-hour.public.entity';

/** The counters a booking holds a place on; null where it holds none. */
export interface HeldPlace {
  slotId: number | null;
  dateId: number | null;
}

@Injectable()
export class PublicScheduleService {
  constructor(
    @InjectRepository(PublicEventSlot, 'public')
    private readonly slotsRepo: Repository<PublicEventSlot>,
    @InjectRepository(PublicEventDate, 'public')
    private readonly datesRepo: Repository<PublicEventDate>,
    @InjectRepository(PublicEventHour, 'public')
    private readonly hoursRepo: Repository<PublicEventHour>,
    @InjectRepository(PublicDimTime, 'public')
    private readonly dimTimesRepo: Repository<PublicDimTime>,
    @InjectRepository(PublicEvent, 'public')
    private readonly eventsRepo: Repository<PublicEvent>,
  ) {}

  async getSlot(slotId: number) {
    return this.slotsRepo.findOne({ where: { event_slot_id: slotId } });
  }

  async getDate(dateId: number) {
    return this.datesRepo.findOne({ where: { event_date_id: dateId } });
  }

  /**
   * Take one place for a booking (SUP-1169): on a slot and the date it belongs
   * to, or on a date alone. Throws 404 for an unknown slot or date, and 409
   * SLOT_FULL when there is no place; nothing is held in either case.
   *
   * Each counter moves in ONE conditional UPDATE, so the database decides who
   * gets the last place. The old code read `reserved`, decided, then wrote
   * `reserved + 1` from that read: 20 parallel bookings all fitted into a slot
   * of 5, and their writes overwrote each other.
   *
   * The counters live in freshtrak_public and the registration in
   * freshtrak_private, so this cannot share a transaction with the insert.
   * The caller saves after this and calls `releasePlace` if the save fails.
   */
  async holdPlace(target: { slotId?: number | null; dateId?: number | null }): Promise<HeldPlace> {
    if (target.slotId) {
      const slotId = target.slotId;
      const slot = await this.getSlot(slotId);
      if (!slot) throw new NotFoundException('Time slot not found');
      const dateId = await this.dateIdForSlot(slot);
      if (!(await this.claimSlotPlace(slotId))) throw slotFullException();
      if (dateId !== null && !(await this.claimDatePlace(dateId))) {
        await this.releaseSlotPlace(slotId);
        throw slotFullException();
      }
      return { slotId, dateId };
    }
    if (target.dateId) {
      const dateId = target.dateId;
      if (!(await this.getDate(dateId))) throw new NotFoundException('Event date not found');
      if (!(await this.claimDatePlace(dateId))) throw slotFullException();
      return { slotId: null, dateId };
    }
    return { slotId: null, dateId: null };
  }

  /** Give back what `holdPlace` took. Counters never go below 0. */
  async releasePlace(held: HeldPlace): Promise<void> {
    if (held.slotId !== null) await this.releaseSlotPlace(held.slotId);
    if (held.dateId !== null) await this.releaseDatePlace(held.dateId);
  }

  /** What a stored registration holds, so cancelling it can give it back. */
  async placeHeldBy(reg: {
    public_event_slot_id?: number | null;
    public_event_date_id?: number | null;
  }): Promise<HeldPlace> {
    if (reg.public_event_slot_id) {
      const slot = await this.getSlot(reg.public_event_slot_id);
      return {
        slotId: reg.public_event_slot_id,
        dateId: slot ? await this.dateIdForSlot(slot) : null,
      };
    }
    return { slotId: null, dateId: reg.public_event_date_id ?? null };
  }

  private async dateIdForSlot(slot: PublicEventSlot): Promise<number | null> {
    const hour = await this.hoursRepo.findOne({ where: { event_hour_id: slot.event_hour_id } });
    return hour?.event_date_id ?? null;
  }

  /**
   * A slot with no capacity set (null or 0) has no places. That is what
   * pantry-finder reports as `open_slots`, and the apps never offer it.
   */
  private claimSlotPlace(slotId: number): Promise<boolean> {
    return this.changedOneRow(
      this.slotsRepo,
      `SET reserved = COALESCE(reserved, 0) + 1
        WHERE event_slot_id = ? AND capacity > 0 AND COALESCE(reserved, 0) < capacity`,
      slotId,
    );
  }

  /**
   * A date's own counter limits it only when its capacity is set (> 0); a date
   * without one is governed by its slots. The same rule decides whether
   * pantry-finder search shows the date (SUP-1198).
   */
  private claimDatePlace(dateId: number): Promise<boolean> {
    return this.changedOneRow(
      this.datesRepo,
      `SET reserved = COALESCE(reserved, 0) + 1
        WHERE event_date_id = ? AND (capacity IS NULL OR capacity <= 0 OR COALESCE(reserved, 0) < capacity)`,
      dateId,
    );
  }

  private async releaseSlotPlace(slotId: number): Promise<void> {
    await this.changedOneRow(
      this.slotsRepo,
      'SET reserved = GREATEST(COALESCE(reserved, 0) - 1, 0) WHERE event_slot_id = ?',
      slotId,
    );
  }

  private async releaseDatePlace(dateId: number): Promise<void> {
    await this.changedOneRow(
      this.datesRepo,
      'SET reserved = GREATEST(COALESCE(reserved, 0) - 1, 0) WHERE event_date_id = ?',
      dateId,
    );
  }

  /** Run `UPDATE <table> <rest>` and report whether it changed exactly one row. */
  private async changedOneRow<T extends ObjectLiteral>(
    repo: Repository<T>,
    rest: string,
    id: number,
  ): Promise<boolean> {
    // tablePath carries the entity's hardcoded database (freshtrak_public.*),
    // which is where TypeORM itself reads these rows from.
    const result: { affectedRows?: number } = await repo.query(
      `UPDATE ${repo.metadata.tablePath} ${rest}`,
      [id],
    );
    return result?.affectedRows === 1;
  }

  async getEventDateIdForDate(eventId: number, dateIso: string): Promise<number | null> {
    // Convert ISO date string (YYYY-MM-DD) to integer key (YYYYMMDD)
    const eventDateKey = parseInt(dateIso.replace(/-/g, ''), 10);
    const row = (
      await this.datesRepo.query(
        'SELECT event_date_id FROM event_dates WHERE event_id = ? AND event_date_key = ? ORDER BY event_date_id LIMIT 1',
        [eventId, eventDateKey],
      )
    )?.[0];
    return row ? (row.event_date_id as number) : null;
  }

  async getEventDateIdForToday(eventId: number): Promise<number | null> {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    return this.getEventDateIdForDate(eventId, today);
  }

  async getEventDateIdDefault(eventId: number): Promise<number | null> {
    // Prefer today; if none, choose next upcoming; if none upcoming, choose most recent past
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayKey = parseInt(`${yyyy}${mm}${dd}`, 10);

    // Next upcoming (including today)
    const upcoming = (
      await this.datesRepo.query(
        'SELECT event_date_id FROM event_dates WHERE event_id = ? AND event_date_key >= ? ORDER BY event_date_key ASC LIMIT 1',
        [eventId, todayKey],
      )
    )?.[0];
    if (upcoming) return upcoming.event_date_id as number;

    // Fallback: most recent past
    const recent = (
      await this.datesRepo.query(
        'SELECT event_date_id FROM event_dates WHERE event_id = ? ORDER BY event_date_key DESC LIMIT 1',
        [eventId],
      )
    )?.[0];
    return recent ? (recent.event_date_id as number) : null;
  }

  // Resolve start/end times from event_dates via dim_times
  async getTimesForDateId(
    eventDateId: number,
  ): Promise<{ start_time: string | null; end_time: string | null }> {
    const row = await this.datesRepo.findOne({ where: { event_date_id: eventDateId } });
    if (!row) return { start_time: null, end_time: null };
    const startRow = row.start_time_key
      ? await this.dimTimesRepo.findOne({ where: { time_key: row.start_time_key } })
      : null;
    const endRow = row.end_time_key
      ? await this.dimTimesRepo.findOne({ where: { time_key: row.end_time_key } })
      : null;
    return {
      start_time: startRow?.mysql_time ?? null,
      end_time: endRow?.mysql_time ?? null,
    };
  }

  // Resolve start/end times from event_slots via dim_times
  async getTimesForSlotId(
    slotId: number,
  ): Promise<{ start_time: string | null; end_time: string | null }> {
    const row = await this.slotsRepo.findOne({ where: { event_slot_id: slotId } });
    if (!row) return { start_time: null, end_time: null };
    const startRow = row.start_time_key
      ? await this.dimTimesRepo.findOne({ where: { time_key: row.start_time_key } })
      : null;
    const endRow = row.end_time_key
      ? await this.dimTimesRepo.findOne({ where: { time_key: row.end_time_key } })
      : null;
    return {
      start_time: startRow?.mysql_time ?? null,
      end_time: endRow?.mysql_time ?? null,
    };
  }

  // Utility: Resolve ISO date (YYYY-MM-DD) for a given public event_date_id
  async getDateIsoForDateId(eventDateId: number): Promise<string | null> {
    const row = (
      await this.datesRepo.query(
        'SELECT event_date_key FROM event_dates WHERE event_date_id = ? LIMIT 1',
        [eventDateId],
      )
    )?.[0];
    const key: number | undefined = row?.event_date_key as number | undefined;
    if (!key) return null;
    const keyStr = String(key).padStart(8, '0');
    return `${keyStr.slice(0, 4)}-${keyStr.slice(4, 6)}-${keyStr.slice(6, 8)}`;
  }

  // Utility: Resolve ISO date for a public slot id by following slot -> hour -> date
  async getDateIsoForSlotId(slotId: number): Promise<string | null> {
    const slot = await this.slotsRepo.findOne({ where: { event_slot_id: slotId } });
    if (!slot?.event_hour_id) return null;
    const hour = await this.hoursRepo.findOne({ where: { event_hour_id: slot.event_hour_id } });
    if (!hour?.event_date_id) return null;
    return this.getDateIsoForDateId(hour.event_date_id);
  }

  // Resolve public event_id from a date id
  async getEventIdForDateId(eventDateId: number): Promise<number | null> {
    const row = (
      await this.datesRepo.query(
        'SELECT event_id FROM event_dates WHERE event_date_id = ? LIMIT 1',
        [eventDateId],
      )
    )?.[0];
    return row?.event_id ?? null;
  }

  // Resolve public event_id from a slot id
  async getEventIdForSlotId(slotId: number): Promise<number | null> {
    const slot = await this.slotsRepo.findOne({ where: { event_slot_id: slotId } });
    if (!slot?.event_hour_id) return null;
    const hour = await this.hoursRepo.findOne({ where: { event_hour_id: slot.event_hour_id } });
    if (!hour?.event_date_id) return null;
    const date = await this.datesRepo.findOne({ where: { event_date_id: hour.event_date_id } });
    return date?.event_id ?? null;
  }

  // Resolve public event name from public events table
  async getEventNameForEventId(eventId: number): Promise<string | null> {
    const row = await this.queryEventFlexible(eventId);
    return row?.name ?? null;
  }

  async getEventNameForDateId(eventDateId: number): Promise<string | null> {
    const eventId = await this.getEventIdForDateId(eventDateId);
    if (!eventId) return null;
    return this.getEventNameForEventId(eventId);
  }

  async getEventNameForSlotId(slotId: number): Promise<string | null> {
    const eventId = await this.getEventIdForSlotId(slotId);
    if (!eventId) return null;
    return this.getEventNameForEventId(eventId);
  }

  /**
   * Event name, address, instructions and hosting agency for the confirmation
   * email. Same source and join as pantry-finder's event_details:
   * events.loc_id → locations (loc_name, phone). Returns null instead of
   * throwing, so a schema difference only drops the details from the email.
   */
  async getEventContactDetails(eventId: number): Promise<{
    eventName: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    instructions: string | null;
    agencyName: string | null;
    agencyPhone: string | null;
  } | null> {
    try {
      const row = (
        await this.eventsRepo.query(
          `SELECT e.event_name, e.address1, e.address2, e.city, e.state, e.zip, e.pub_desc_long,
                  l.loc_name, l.phone
             FROM events e
             LEFT JOIN locations l ON l.loc_id = e.loc_id
            WHERE e.event_id = ?
            LIMIT 1`,
          [eventId],
        )
      )?.[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
      return {
        eventName: str(row.event_name),
        address1: str(row.address1),
        address2: str(row.address2),
        city: str(row.city),
        state: str(row.state),
        zip: str(row.zip),
        instructions: str(row.pub_desc_long),
        agencyName: str(row.loc_name),
        agencyPhone: str(row.phone),
      };
    } catch (err) {
      console.warn(
        '[PublicSchedule] getEventContactDetails failed',
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  }

  async eventExists(eventId: number): Promise<boolean> {
    const row = await this.queryEventFlexible(eventId);
    return !!row;
  }

  async listEvents(params: { active?: boolean; from?: string; to?: string }) {
    // Derive optional key filters
    const where: string[] = [];
    const args: Array<string | number> = [];
    if (params.from) {
      const key = parseInt(params.from.replace(/-/g, ''), 10);
      if (!Number.isNaN(key)) {
        where.push('d.event_date_key >= ?');
        args.push(key);
      }
    }
    if (params.to) {
      const key = parseInt(params.to.replace(/-/g, ''), 10);
      if (!Number.isNaN(key)) {
        where.push('d.event_date_key <= ?');
        args.push(key);
      }
    }
    if (params.active !== undefined) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const todayKey = parseInt(`${yyyy}${mm}${dd}`, 10);
      if (params.active) {
        where.push('d.event_date_key >= ?');
        args.push(todayKey);
      } else {
        // if inactive requested, simply allow any; upstream can filter further if desired
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.queryEventsListFlexible(whereSql, args);
    return rows.map((r) => ({ id: r.event_id, name: r.name }));
  }

  async getEvent(eventId: number): Promise<{ id: number; name: string } | null> {
    const row = await this.queryEventFlexible(eventId);
    return row ? { id: Number(row.id), name: row.name } : null;
  }

  // Flexible query helpers to handle schema variations across environments
  private async queryEventFlexible(eventId: number): Promise<{ id: number; name: string } | null> {
    // FreshTrak public schema: events(event_id, event_name)
    const row = (
      await this.eventsRepo.query(
        'SELECT event_id AS id, event_name AS name FROM events WHERE event_id = ? LIMIT 1',
        [eventId],
      )
    )?.[0];
    return row ? { id: Number(row.id), name: String(row.name) } : null;
  }

  private async queryEventsListFlexible(
    whereSql: string,
    args: Array<string | number>,
  ): Promise<Array<{ event_id: number; name: string }>> {
    // FreshTrak public schema: events(event_id, event_name)
    const sql = `SELECT DISTINCT e.event_id AS event_id, e.event_name AS name
       FROM events e
       JOIN event_dates d ON d.event_id = e.event_id
       ${whereSql}
       ORDER BY e.event_id ASC`;
    const rows = await this.eventsRepo.query(sql, args);
    return Array.isArray(rows) ? rows : [];
  }
  // Build legacy-style structure for a single event_date with nested hours and slots
  async buildEventDateStructure(eventDateId: number) {
    const [dateRow] = await this.datesRepo.query(
      'SELECT event_date_id AS id, event_id, capacity, reserved, event_date_key FROM event_dates WHERE event_date_id = ? LIMIT 1',
      [eventDateId],
    );
    if (!dateRow) return { event_date: null };

    const hours: Array<{ event_hour_id: number; event_date_id: number; capacity?: number | null }> =
      await this.datesRepo.query(
        'SELECT event_hour_id, event_date_id, capacity FROM event_hours WHERE event_date_id = ? ORDER BY event_hour_id ASC',
        [eventDateId],
      );

    const parseTimeToMinutes = (raw: unknown): number => {
      if (raw == null) return Number.POSITIVE_INFINITY;
      const s = String(raw).trim();
      // Examples: "9:30 AM", "10 AM", "10:59 AM", "1 PM"
      const ampmMatch = s.match(/\b(AM|PM)\b/i);
      const isPM = ampmMatch ? ampmMatch[1].toUpperCase() === 'PM' : false;
      const timePart = s.replace(/\b(AM|PM)\b/i, '').trim();
      const parts = timePart.split(':');
      let hours = 0;
      let minutes = 0;
      if (parts.length === 1) {
        hours = parseInt(parts[0], 10) || 0;
      } else if (parts.length >= 2) {
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
      }
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0; // 12 AM
      return hours * 60 + minutes;
    };

    type SimpleSlot = {
      event_slot_id?: number;
      capacity?: number;
      open_slots?: number;
      start_time?: string | null;
      end_time?: string | null;
    };
    const slotsByHour: Record<number, SimpleSlot[]> = {};
    for (const hr of hours) {
      const slotsRows: Array<{
        event_slot_id: number;
        event_hour_id: number;
        capacity?: number | null;
        reserved?: number | null;
      }> = await this.slotsRepo.query(
        'SELECT event_slot_id, event_hour_id, capacity, reserved FROM event_slots WHERE event_hour_id = ? ORDER BY event_slot_id ASC',
        [hr.event_hour_id],
      );
      slotsByHour[hr.event_hour_id] = slotsRows.map(
        (s): SimpleSlot => ({
          event_slot_id: s.event_slot_id,
          capacity: s.capacity ?? undefined,
          start_time: null,
          end_time: null,
          open_slots: Math.max(0, (s.capacity ?? 0) - (s.reserved ?? 0)),
        }),
      );
    }

    type EventHourAgg = {
      event_hour_id: number;
      capacity: number;
      start_time: string | null;
      end_time: string | null;
      open_slots: number;
      event_slots: SimpleSlot[];
    };

    const event_hours: EventHourAgg[] = hours.map((h): EventHourAgg => {
      const slotList: SimpleSlot[] = slotsByHour[h.event_hour_id] ?? [];
      const hourOpen = slotList.reduce(
        (sum: number, s: SimpleSlot) => sum + (s.open_slots ?? 0),
        0,
      );
      // No time columns available; keep null start/end for hour as well
      const hourStart: string | null = null;
      const hourEnd: string | null = null;
      return {
        event_hour_id: h.event_hour_id,
        capacity:
          h.capacity ?? slotList.reduce((sum: number, s: SimpleSlot) => sum + (s.capacity ?? 0), 0),
        start_time: hourStart,
        end_time: hourEnd,
        open_slots: hourOpen,
        event_slots: slotList,
      };
    });

    const totalOpen = event_hours.reduce(
      (sum: number, hr: EventHourAgg) => sum + (hr.open_slots ?? 0),
      0,
    );

    // Derive date-level start/end and date string from key
    const allStartCandidates: string[] = event_hours
      .map((h: any) => h.start_time as string | null)
      .filter((v: string | null): v is string => typeof v === 'string' && v.length > 0);
    const allEndCandidates: string[] = event_hours
      .map((h: any) => h.end_time as string | null)
      .filter((v: string | null): v is string => typeof v === 'string' && v.length > 0);

    const dateStart: string | null =
      allStartCandidates.length > 0
        ? allStartCandidates.reduce((min: string, v: string) => {
            return parseTimeToMinutes(v) < parseTimeToMinutes(min) ? v : min;
          }, allStartCandidates[0])
        : null;

    const dateEnd: string | null =
      allEndCandidates.length > 0
        ? allEndCandidates.reduce((max: string, v: string) => {
            return parseTimeToMinutes(v) > parseTimeToMinutes(max) ? v : max;
          }, allEndCandidates[0])
        : null;

    const key: number | undefined = dateRow.event_date_key as number | undefined;
    const keyStr = key ? String(key).padStart(8, '0') : undefined;
    const dateIso = keyStr
      ? `${keyStr.slice(0, 4)}-${keyStr.slice(4, 6)}-${keyStr.slice(6, 8)}`
      : null;

    return {
      event_date: {
        id: dateRow.id,
        event_id: dateRow.event_id,
        capacity: dateRow.capacity,
        accept_walkin: 1,
        accept_reservations: 1,
        accept_interest: 0,
        start_time: dateStart,
        end_time: dateEnd,
        date: dateIso,
        open_slots: totalOpen,
        event_hours,
      },
    };
  }
}
