import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../../entities/registration.entity';
import { RegistrationAttendee } from '../../entities/registration-attendee.entity';
import { Event } from '../../entities/event.entity';
import { EventTimeslot } from '../../entities/event-timeslot.entity';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckInAudit } from '../../entities/checkin-audit.entity';
import { PublicScheduleService } from '../public-schedule/public-schedule.service';
import { Authentication } from '../../entities/authentication.entity';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration) private readonly regsRepo: Repository<Registration>,
    @InjectRepository(RegistrationAttendee)
    private readonly attendeesRepo: Repository<RegistrationAttendee>,
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(EventTimeslot) private readonly timesRepo: Repository<EventTimeslot>,
    @InjectRepository(CheckInAudit) private readonly checkinsRepo: Repository<CheckInAudit>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly publicSchedule: PublicScheduleService,
  ) {}

  async listForEvent(eventId: number) {
    return this.regsRepo.find({ where: { event_id: eventId } });
  }

  async registerForEvent(
    user: any,
    dto: {
      event_id: number;
      timeslot_id?: number;
      attendees?: number[];
      event_slot_id?: number;
      event_date_id?: number;
    },
    guestToken?: string,
  ) {
    const event = await this.eventsRepo.findOne({ where: { id: dto.event_id, is_active: true } });
    if (!event) throw new NotFoundException('Event not found');
    if (dto.timeslot_id) {
      const timeslot = await this.timesRepo.findOne({
        where: { id: dto.timeslot_id, event_id: dto.event_id, is_active: true },
      });
      if (!timeslot) throw new NotFoundException('Timeslot not found');
    }
    // Resolve household (prefer explicit guest token if provided)
    let dbUserId: number | null = null;
    if (guestToken) {
      const auth = await this.authRepo.findOne({ where: { token: guestToken } });
      dbUserId = auth ? (auth.user_id as unknown as number) : null;
    } else if (user?.authType === 'guest' && typeof user.dbUserId === 'number') {
      dbUserId = user.dbUserId;
    } else {
      const sub = (user?.userId as string) ?? (user?.id as string);
      dbUserId = await this.usersService.findDbUserIdByCognitoUuid(sub);
    }
    if (!dbUserId) throw new ForbiddenException('User not found');
    let household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
    if (!household_id) {
      // Auto-create a minimal household for this user (guest-first flow)
      try {
        const userEntity = await this.usersService.findById(dbUserId);
        await this.householdsService.createHousehold(dbUserId, {
          primary_first_name: userEntity.first_name || 'Guest',
          primary_last_name: userEntity.last_name || 'User',
          primary_date_of_birth: (userEntity.date_of_birth as unknown as string) || '1900-01-01',
        } as any);
        household_id = await this.householdsService.findHouseholdIdByUserId(dbUserId);
      } catch (_) {
        // ignore and fall through to error
      }
    }
    if (!household_id) throw new ForbiddenException('Household not resolved');

    const existing = await this.regsRepo.findOne({
      where: [
        { event_id: dto.event_id, household_id, status: 'confirmed' } as any,
        { event_id: dto.event_id, household_id, status: 'waitlisted' } as any,
        { event_id: dto.event_id, household_id, status: 'checked_in' } as any,
      ],
    });
    if (existing) throw new BadRequestException('Already registered');

    // Capacity check
    let capacity: number | null = null;
    let confirmedCount = 0;
    if (dto.event_slot_id) {
      const slot = await this.publicSchedule.getSlot(dto.event_slot_id);
      capacity = slot?.capacity ?? null;
      if (slot && slot.capacity !== null && slot.reserved >= slot.capacity) {
        // Mark as full → will create waitlisted registration (no counters incremented)
        confirmedCount = slot.capacity;
      }
    } else if (dto.timeslot_id) {
      const timeslot = await this.timesRepo.findOne({ where: { id: dto.timeslot_id } });
      capacity = timeslot?.capacity ?? null;
      confirmedCount = await this.regsRepo.count({
        where: { timeslot_id: dto.timeslot_id, status: 'confirmed' } as any,
      });
    } else if (dto.event_date_id) {
      const date = await this.publicSchedule.getDate(dto.event_date_id);
      capacity = date?.capacity ?? null;
      if (date && date.capacity !== null && date.reserved >= date.capacity) {
        // Mark as full → will create waitlisted registration
        confirmedCount = date.capacity;
      }
    } else {
      capacity = event.capacity ?? null;
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
    const savedOrArray = await this.regsRepo.save(reg);
    const saved: Registration = Array.isArray(savedOrArray)
      ? (savedOrArray[0] as Registration)
      : (savedOrArray as Registration);
    if (Array.isArray(dto.attendees) && dto.attendees.length) {
      for (const memberId of dto.attendees) {
        const attendee = this.attendeesRepo.create({
          registration_id: saved.id,
          household_member_id: memberId,
        } as any);
        await this.attendeesRepo.save(attendee);
      }
    }
    // Update public counters after success
    if (hasCapacity) {
      if (dto.event_slot_id) await this.publicSchedule.incrementSlotAndDate(dto.event_slot_id);
      else if (dto.event_date_id) await this.publicSchedule.incrementDate(dto.event_date_id);
    }
    return saved;
  }

  async cancelRegistration(user: any, registrationId: number) {
    const reg = await this.regsRepo.findOne({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found');
    // Resolve household via JWT sub
    const dbUserId =
      user?.authType === 'guest' && typeof user.dbUserId === 'number'
        ? (user.dbUserId as number)
        : await this.usersService.findDbUserIdByCognitoUuid(
            ((user?.userId as string) ?? (user?.id as string)) as string,
          );
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

  async checkIn(user: any, dto: CheckInDto) {
    const reg = await this.regsRepo.findOne({ where: { id: dto.registration_id } });
    if (!reg) throw new NotFoundException('Registration not found');
    // Resolve household via JWT sub
    const dbUserId =
      user?.authType === 'guest' && typeof user.dbUserId === 'number'
        ? (user.dbUserId as number)
        : await this.usersService.findDbUserIdByCognitoUuid(
            ((user?.userId as string) ?? (user?.id as string)) as string,
          );
    if (!dbUserId) throw new ForbiddenException('User not found');
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
    const next = await this.regsRepo.find({ where, order: { created_at: 'ASC' }, take: 1 } as any);
    if (!next.length) return;
    const toPromote = next[0];
    toPromote.status = 'confirmed';
    await this.regsRepo.save(toPromote);
  }
}
