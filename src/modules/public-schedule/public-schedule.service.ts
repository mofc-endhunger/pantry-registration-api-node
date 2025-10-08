import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicEventSlot } from '../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../entities-public/event-date.public.entity';
import { PublicEventHour } from '../../entities-public/event-hour.public.entity';

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
}
