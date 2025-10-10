import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateTimeslotDto } from './dto/create-timeslot.dto';
import { UpdateTimeslotDto } from './dto/update-timeslot.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(EventTimeslot) private readonly timeslotsRepo: Repository<EventTimeslot>,
  ) {}

  async list(params: { active?: boolean; from?: string; to?: string }) {
    const qb = this.eventsRepo.createQueryBuilder('e');
    if (params.active !== undefined) {
      qb.andWhere('e.is_active = :active', { active: params.active });
    }
    if (params.from) {
      qb.andWhere('(e.start_at IS NULL OR e.start_at >= :from)', { from: params.from });
    }
    if (params.to) {
      qb.andWhere('(e.end_at IS NULL OR e.end_at <= :to)', { to: params.to });
    }
    // MySQL doesn't support 'NULLS LAST'; emulate by ordering nulls last, then ascending by value
    qb.orderBy('e.start_at IS NULL', 'ASC').addOrderBy('e.start_at', 'ASC');
    return qb.getMany();
  }

  async get(id: number) {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async create(dto: CreateEventDto) {
    const entity = this.eventsRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      start_at: dto.start_at ? new Date(dto.start_at) : null,
      end_at: dto.end_at ? new Date(dto.end_at) : null,
      capacity: dto.capacity ?? null,
      is_active: dto.is_active ?? true,
    } as any);
    return this.eventsRepo.save(entity);
  }

  async update(id: number, dto: UpdateEventDto) {
    const event = await this.get(id);
    if (dto.name !== undefined) event.name = dto.name;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.start_at !== undefined) event.start_at = dto.start_at ? new Date(dto.start_at) : null;
    if (dto.end_at !== undefined) event.end_at = dto.end_at ? new Date(dto.end_at) : null;
    if (dto.capacity !== undefined) event.capacity = dto.capacity;
    if (dto.is_active !== undefined) event.is_active = dto.is_active;
    return this.eventsRepo.save(event);
  }

  async remove(id: number) {
    const event = await this.get(id);
    return this.eventsRepo.remove(event);
  }

  listTimeslots(eventId: number) {
    return this.timeslotsRepo.find({ where: { event_id: eventId } });
  }

  async createTimeslot(dto: CreateTimeslotDto) {
    const entity = this.timeslotsRepo.create({
      event_id: dto.event_id,
      start_at: new Date(dto.start_at),
      end_at: new Date(dto.end_at),
      capacity: dto.capacity,
      is_active: dto.is_active,
    } as any);
    return this.timeslotsRepo.save(entity);
  }

  async updateTimeslot(id: number, dto: UpdateTimeslotDto) {
    const slot = await this.timeslotsRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Timeslot not found');
    if (dto.event_id !== undefined) slot.event_id = dto.event_id;
    if (dto.start_at !== undefined) slot.start_at = new Date(dto.start_at);
    if (dto.end_at !== undefined) slot.end_at = new Date(dto.end_at);
    if (dto.capacity !== undefined) slot.capacity = dto.capacity;
    if (dto.is_active !== undefined) slot.is_active = dto.is_active;
    return this.timeslotsRepo.save(slot);
  }

  async removeTimeslot(id: number) {
    const slot = await this.timeslotsRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Timeslot not found');
    return this.timeslotsRepo.remove(slot);
  }
}
