import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { RegistrationsService } from '../registrations.service';
import { Registration } from '../../../entities/registration.entity';
import { RegistrationAttendee } from '../../../entities/registration-attendee.entity';
import { Event } from '../../../entities/event.entity';
import { EventTimeslot } from '../../../entities/event-timeslot.entity';
import { CheckInAudit } from '../../../entities/checkin-audit.entity';
import { PublicScheduleService } from '../../public-schedule/public-schedule.service';
import { UsersService } from '../../users/users.service';
import { HouseholdsService } from '../../households/households.service';
import { Authentication } from '../../../entities/authentication.entity';

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let regsRepo: jest.Mocked<Repository<Registration>>;
  let attendeesRepo: jest.Mocked<Repository<RegistrationAttendee>>;
  let eventsRepo: jest.Mocked<Repository<Event>>;
  let timesRepo: jest.Mocked<Repository<EventTimeslot>>;
  let checkinsRepo: jest.Mocked<Repository<CheckInAudit>>;
  let authRepo: jest.Mocked<Repository<Authentication>>;
  let usersService: jest.Mocked<UsersService>;
  let householdsService: jest.Mocked<HouseholdsService>;
  let publicSchedule: jest.Mocked<PublicScheduleService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: getRepositoryToken(Registration), useValue: createRepoMock<Registration>() },
        {
          provide: getRepositoryToken(RegistrationAttendee),
          useValue: createRepoMock<RegistrationAttendee>(),
        },
        { provide: getRepositoryToken(Event), useValue: createRepoMock<Event>() },
        { provide: getRepositoryToken(EventTimeslot), useValue: createRepoMock<EventTimeslot>() },
        { provide: getRepositoryToken(CheckInAudit), useValue: createRepoMock<CheckInAudit>() },
        { provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
        { provide: UsersService, useValue: createUsersServiceMock() },
        { provide: HouseholdsService, useValue: createHouseholdsServiceMock() },
        { provide: PublicScheduleService, useValue: createPublicScheduleMock() },
      ],
    }).compile();

    service = moduleRef.get(RegistrationsService);
    regsRepo = moduleRef.get(getRepositoryToken(Registration));
    attendeesRepo = moduleRef.get(getRepositoryToken(RegistrationAttendee));
    eventsRepo = moduleRef.get(getRepositoryToken(Event));
    timesRepo = moduleRef.get(getRepositoryToken(EventTimeslot));
    checkinsRepo = moduleRef.get(getRepositoryToken(CheckInAudit));
    authRepo = moduleRef.get(getRepositoryToken(Authentication));
    usersService = moduleRef.get(UsersService);
    householdsService = moduleRef.get(HouseholdsService);
    publicSchedule = moduleRef.get(PublicScheduleService);
  });

  it('throws NotFound when event does not exist', async () => {
    eventsRepo.findOne.mockResolvedValue(null as any);
    await expect(service.registerForEvent({} as any, { event_id: 999 } as any)).rejects.toThrow(
      'Event not found',
    );
  });

  it('creates waitlisted registration when slot capacity is full', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    publicSchedule.getSlot.mockResolvedValue({ capacity: 1, reserved: 1 } as any);
    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 123, status: 'waitlisted' } as any);

    const result = await service.registerForEvent(
      { authType: 'guest', dbUserId: 10 } as any,
      {
        event_id: 1,
        event_slot_id: 111,
      } as any,
    );

    expect(result.status).toBe('waitlisted');
    expect(publicSchedule.incrementSlotAndDate).not.toHaveBeenCalled();
  });

  it('creates confirmed registration for timeslot_id with available capacity', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    timesRepo.findOne.mockResolvedValue({ id: 5, capacity: 3 } as any);
    regsRepo.count.mockResolvedValue(1 as any);
    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 300, status: 'confirmed' } as any);

    const result = await service.registerForEvent(
      { authType: 'guest', dbUserId: 10 } as any,
      { event_id: 1, timeslot_id: 5 } as any,
    );

    expect(result.status).toBe('confirmed');
    // No public counters updated for timeslot branch
    expect(publicSchedule.incrementSlotAndDate).not.toHaveBeenCalled();
    expect(publicSchedule.incrementDate).not.toHaveBeenCalled();
  });

  it('creates waitlisted registration for timeslot_id when full', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    timesRepo.findOne.mockResolvedValue({ id: 5, capacity: 1 } as any);
    regsRepo.count.mockResolvedValue(1 as any);
    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 301, status: 'waitlisted' } as any);

    const result = await service.registerForEvent(
      { authType: 'guest', dbUserId: 10 } as any,
      { event_id: 1, timeslot_id: 5 } as any,
    );
    expect(result.status).toBe('waitlisted');
  });

  it('event_date_id branch increments date counter on confirm', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    publicSchedule.getDate.mockResolvedValue({ event_date_id: 9, capacity: 2, reserved: 1 } as any);
    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 400, status: 'confirmed' } as any);

    const result = await service.registerForEvent(
      { authType: 'guest', dbUserId: 10 } as any,
      { event_id: 1, event_date_id: 9 } as any,
    );
    expect(result.status).toBe('confirmed');
    expect(publicSchedule.incrementDate).toHaveBeenCalledWith(9);
  });

  it('persists attendees when provided', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true, capacity: null } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.count.mockResolvedValue(0 as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 555, status: 'confirmed' } as any);
    attendeesRepo.create.mockImplementation((x: any) => x);

    await service.registerForEvent(
      { authType: 'guest', dbUserId: 10 } as any,
      { event_id: 1, attendees: [3, 4] } as any,
    );

    expect(attendeesRepo.save).toHaveBeenCalledTimes(2);
    expect(attendeesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ registration_id: 555, household_member_id: 3 }),
    );
    expect(attendeesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ registration_id: 555, household_member_id: 4 }),
    );
  });

  it('throws Already registered when existing registration is found', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    regsRepo.findOne.mockResolvedValue({ id: 999, status: 'confirmed' } as any);

    await expect(
      service.registerForEvent({ authType: 'guest', dbUserId: 10 } as any, { event_id: 1 } as any),
    ).rejects.toThrow('Already registered');
  });

  it('auto-provisions user and household when Cognito user not found', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true, capacity: null } as any);
    // No guest token path; simulate JWT path with missing user in DB
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValueOnce(null);
    // Provisioning flow
    (usersService.create as jest.Mock).mockResolvedValueOnce({ user: { id: 77 } });
    (usersService.findById as jest.Mock).mockResolvedValueOnce({
      first_name: 'Auto',
      last_name: 'User',
      date_of_birth: null,
    } as any);
    // household not found initially, then found after creation
    (householdsService.findHouseholdIdByUserId as jest.Mock)
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(88 as any);
    (householdsService.createHousehold as jest.Mock).mockResolvedValueOnce({ id: 88 } as any);

    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.count.mockResolvedValue(0 as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 500, status: 'confirmed' } as any);

    const result = await service.registerForEvent(
      { userId: 'sub-123', email: 'u@example.com', username: 'u' } as any,
      { event_id: 1 } as any,
    );

    expect(result.id).toBe(500);
    expect(usersService.create).toHaveBeenCalled();
    expect(householdsService.createHousehold).toHaveBeenCalledWith(77, expect.any(Object));
  });

  it('cancelRegistration sets cancelled, promotes waitlisted, decrements counters', async () => {
    const reg: any = {
      id: 1,
      event_id: 1,
      timeslot_id: null,
      household_id: 20,
      status: 'confirmed',
      public_event_slot_id: 222,
    };
    regsRepo.findOne.mockResolvedValue(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);
    regsRepo.save.mockImplementation(async (x: any) => x);
    // Next waitlisted to promote
    regsRepo.find.mockResolvedValue([{ id: 2, status: 'waitlisted' } as any] as any);

    const result = await service.cancelRegistration({ userId: 'jwt' } as any, 1);

    expect(result.status).toBe('cancelled');
    expect(publicSchedule.decrementSlotAndDate).toHaveBeenCalledWith(222);
    // Promotion saved
    expect(regsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, status: 'confirmed' }),
    );
  });

  it('cancelRegistration decrements date when public_event_date_id is set', async () => {
    const reg: any = {
      id: 9,
      event_id: 1,
      timeslot_id: null,
      household_id: 20,
      status: 'confirmed',
      public_event_slot_id: null,
      public_event_date_id: 123,
    };
    regsRepo.findOne.mockResolvedValue(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);
    regsRepo.save.mockImplementation(async (x: any) => x);
    // ensure promoteFromWaitlist early returns
    regsRepo.find.mockResolvedValueOnce([] as any);

    const result = await service.cancelRegistration({ userId: 'jwt' } as any, 9);

    expect(result.status).toBe('cancelled');
    expect(publicSchedule.decrementDate).toHaveBeenCalledWith(123);
  });

  it('checkIn throws Forbidden when household mismatch', async () => {
    const reg: any = { id: 9, household_id: 20, status: 'confirmed' };
    regsRepo.findOne.mockResolvedValue(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(30 as any);

    await expect(
      service.checkIn({ userId: 'jwt' } as any, { registration_id: 9, attendee_ids: [] } as any),
    ).rejects.toThrow('Forbidden');
  });

  it('checkIn updates status and writes audit', async () => {
    const reg: any = { id: 9, household_id: 20, status: 'confirmed' };
    regsRepo.findOne.mockResolvedValue(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);
    checkinsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockImplementation(async (x: any) => x);

    const result = await service.checkIn(
      { userId: 'jwt' } as any,
      { registration_id: 9, attendee_ids: [1, 2] } as any,
    );

    expect(result.status).toBe('checked_in');
    expect(checkinsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ registration_id: 9, created_by: 10, attendees_count: 2 }),
    );
  });

  it('throws NotFound when timeslot_id provided but not found', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    timesRepo.findOne.mockResolvedValue(null as any);
    await expect(
      service.registerForEvent({} as any, { event_id: 1, timeslot_id: 999 } as any),
    ).rejects.toThrow('Timeslot not found');
  });

  it('event_date_id branch waitlists when date is full and does not increment', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 1, is_active: true } as any);
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    householdsService.findHouseholdIdByUserId.mockResolvedValue(20 as any);
    publicSchedule.getDate.mockResolvedValue({ event_date_id: 9, capacity: 1, reserved: 1 } as any);
    regsRepo.findOne.mockResolvedValue(null as any);
    regsRepo.create.mockImplementation((x: any) => x);
    regsRepo.save.mockResolvedValue({ id: 401, status: 'waitlisted' } as any);

    const result = await service.registerForEvent(
      { authType: 'guest', dbUserId: 10 } as any,
      { event_id: 1, event_date_id: 9 } as any,
    );
    expect(result.status).toBe('waitlisted');
    expect(publicSchedule.incrementDate).not.toHaveBeenCalled();
  });

  it('cancelRegistration decrements slot and date when public_event_slot_id is set', async () => {
    const reg: any = {
      id: 11,
      event_id: 1,
      timeslot_id: null,
      household_id: 20,
      status: 'confirmed',
      public_event_slot_id: 777,
      public_event_date_id: null,
    };
    regsRepo.findOne.mockResolvedValue(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);
    regsRepo.save.mockImplementation(async (x: any) => x);
    // avoid promotion path
    regsRepo.find.mockResolvedValueOnce([] as any);

    const result = await service.cancelRegistration({ userId: 'jwt' } as any, 11);

    expect(result.status).toBe('cancelled');
    expect(publicSchedule.decrementSlotAndDate).toHaveBeenCalledWith(777);
  });

  it('cancelRegistration promotes next waitlisted for same timeslot', async () => {
    const reg: any = {
      id: 21,
      event_id: 1,
      timeslot_id: 5,
      household_id: 20,
      status: 'confirmed',
      public_event_slot_id: null,
      public_event_date_id: null,
    };
    regsRepo.findOne.mockResolvedValueOnce(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);
    // A waitlisted registration exists to promote
    regsRepo.find.mockResolvedValueOnce([{ id: 22, status: 'waitlisted' } as any] as any);
    regsRepo.save.mockImplementation(async (x: any) => x);

    const result = await service.cancelRegistration({ userId: 'jwt' } as any, 21);

    expect(result.status).toBe('cancelled');
    expect(regsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 22, status: 'confirmed' }),
    );
  });

  it('cancelRegistration returns early when already cancelled', async () => {
    const reg: any = {
      id: 31,
      event_id: 1,
      timeslot_id: null,
      household_id: 20,
      status: 'cancelled',
    };
    regsRepo.findOne.mockResolvedValueOnce(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);

    const result = await service.cancelRegistration({ userId: 'jwt' } as any, 31);

    expect(result.status).toBe('cancelled');
    expect(publicSchedule.decrementDate).not.toHaveBeenCalled();
    expect(publicSchedule.decrementSlotAndDate).not.toHaveBeenCalled();
  });

  it('cancelRegistration throws Forbidden when household mismatch', async () => {
    const reg: any = {
      id: 41,
      event_id: 1,
      timeslot_id: null,
      household_id: 999,
      status: 'confirmed',
    };
    regsRepo.findOne.mockResolvedValueOnce(reg);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValue(10 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20 as any);

    await expect(service.cancelRegistration({ userId: 'jwt' } as any, 41)).rejects.toThrow(
      'Forbidden',
    );
  });

  it('listForMe returns registrations for guest token path', async () => {
    (authRepo.findOne as jest.Mock).mockResolvedValueOnce({ user_id: 55 } as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValueOnce(101 as any);
    regsRepo.find.mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as any);

    const res = await service.listForMe({}, 'guest-token-1');
    expect(res.length).toBe(2);
    expect(authRepo.findOne).toHaveBeenCalledWith({ where: { token: 'guest-token-1' } });
  });

  it('listForMe throws Forbidden when user not resolved', async () => {
    (authRepo.findOne as jest.Mock).mockResolvedValueOnce(null as any);
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValueOnce(null as any);
    (usersService.create as jest.Mock).mockResolvedValueOnce({ user: { id: null } });
    await expect(service.listForMe({} as any)).rejects.toThrow('User not found');
  });

  it('listForMe throws Forbidden when household not resolved', async () => {
    (usersService.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValueOnce(77 as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValueOnce(null as any);
    await expect(service.listForMe({ userId: 'sub' } as any)).rejects.toThrow(
      'Household not resolved',
    );
  });
});

function createRepoMock<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
  } as any;
}

function createUsersServiceMock(): jest.Mocked<UsersService> {
  return {
    findDbUserIdByCognitoUuid: jest.fn(),
    create: jest.fn().mockResolvedValue({ user: { id: 10 } } as any),
    findById: jest
      .fn()
      .mockResolvedValue({ first_name: 'Guest', last_name: 'User', date_of_birth: null } as any),
  } as any;
}

function createHouseholdsServiceMock(): jest.Mocked<HouseholdsService> {
  return {
    findHouseholdIdByUserId: jest.fn(),
    createHousehold: jest.fn(),
  } as any;
}

function createPublicScheduleMock(): jest.Mocked<PublicScheduleService> {
  return {
    getSlot: jest.fn(),
    getDate: jest.fn(),
    incrementSlotAndDate: jest.fn(),
    decrementSlotAndDate: jest.fn(),
    incrementDate: jest.fn(),
    decrementDate: jest.fn(),
    getEventDateIdForDate: jest.fn(),
    getEventDateIdForToday: jest.fn(),
    getEventDateIdDefault: jest.fn(),
    buildEventDateStructure: jest.fn(),
  } as any;
}
