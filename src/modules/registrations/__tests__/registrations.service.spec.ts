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
