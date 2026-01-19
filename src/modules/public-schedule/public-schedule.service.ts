/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-base-to-string */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicEventSlot } from '../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../entities-public/event-date.public.entity';

@Injectable()
export class PublicScheduleService {
  constructor(
    @InjectRepository(PublicEventSlot, 'public')
    private readonly slotsRepo: Repository<PublicEventSlot>,
    @InjectRepository(PublicEventDate, 'public')
    private readonly datesRepo: Repository<PublicEventDate>,
  ) {}

  async getSlot(slotId: number) {
    return this.slotsRepo.findOne({ where: { event_slot_id: slotId } });
  }

  async getDate(dateId: number) {
    return this.datesRepo.findOne({ where: { event_date_id: dateId } });
  }

  async incrementSlotAndDate(slotId: number) {
    const slot = await this.getSlot(slotId);
    if (!slot) return;
    await this.slotsRepo.update({ event_slot_id: slotId }, { reserved: slot.reserved + 1 } as any);
    const hour = (
      await this.slotsRepo.query('SELECT event_hour_id FROM event_slots WHERE event_slot_id = ?', [
        slotId,
      ])
    )?.[0];
    if (!hour) return;
    const dateRow = (
      await this.slotsRepo.query('SELECT event_date_id FROM event_hours WHERE event_hour_id = ?', [
        hour.event_hour_id,
      ])
    )?.[0];
    if (!dateRow) return;
    const date = await this.datesRepo.findOne({ where: { event_date_id: dateRow.event_date_id } });
    if (date)
      await this.datesRepo.update({ event_date_id: date.event_date_id }, {
        reserved: date.reserved + 1,
      } as any);
  }

  async decrementSlotAndDate(slotId: number) {
    const slot = await this.getSlot(slotId);
    if (!slot) return;
    await this.slotsRepo.update({ event_slot_id: slotId }, {
      reserved: Math.max(0, slot.reserved - 1),
    } as any);
    const hour = (
      await this.slotsRepo.query('SELECT event_hour_id FROM event_slots WHERE event_slot_id = ?', [
        slotId,
      ])
    )?.[0];
    if (!hour) return;
    const dateRow = (
      await this.slotsRepo.query('SELECT event_date_id FROM event_hours WHERE event_hour_id = ?', [
        hour.event_hour_id,
      ])
    )?.[0];
    if (!dateRow) return;
    const date = await this.datesRepo.findOne({ where: { event_date_id: dateRow.event_date_id } });
    if (date)
      await this.datesRepo.update({ event_date_id: date.event_date_id }, {
        reserved: Math.max(0, date.reserved - 1),
      } as any);
  }

  async incrementDate(dateId: number) {
    const date = await this.getDate(dateId);
    if (!date) return;
    await this.datesRepo.update({ event_date_id: dateId }, { reserved: date.reserved + 1 } as any);
  }

  async decrementDate(dateId: number) {
    const date = await this.getDate(dateId);
    if (!date) return;
    await this.datesRepo.update({ event_date_id: dateId }, {
      reserved: Math.max(0, date.reserved - 1),
    } as any);
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
    const hourRows: Array<{ event_hour_id: number }> = await this.slotsRepo.query(
      'SELECT event_hour_id FROM event_slots WHERE event_slot_id = ? LIMIT 1',
      [slotId],
    );
    const hourRow = hourRows?.[0];
    if (!hourRow?.event_hour_id) return null;
    const dateRows: Array<{ event_date_id: number }> = await this.slotsRepo.query(
      'SELECT event_date_id FROM event_hours WHERE event_hour_id = ? LIMIT 1',
      [hourRow.event_hour_id],
    );
    const dateRow = dateRows?.[0];
    if (!dateRow?.event_date_id) return null;
    return this.getDateIsoForDateId(dateRow.event_date_id);
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

    type SimpleSlot = { open_slots?: number; capacity?: number };
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
