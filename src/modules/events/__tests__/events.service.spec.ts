import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { EventsService } from '../events.service';
import { Event } from '../../../entities/event.entity';
import { EventTimeslot } from '../../../entities/event-timeslot.entity';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepo: jest.Mocked<Repository<Event>>;
  let timeslotsRepo: jest.Mocked<Repository<EventTimeslot>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: createRepoMock<Event>() },
        { provide: getRepositoryToken(EventTimeslot), useValue: createRepoMock<EventTimeslot>() },
      ],
    }).compile();

    service = moduleRef.get(EventsService);
    eventsRepo = moduleRef.get(getRepositoryToken(Event));
    timeslotsRepo = moduleRef.get(getRepositoryToken(EventTimeslot));
  });

  it('create maps nullable fields and saves', async () => {
    eventsRepo.create.mockImplementation((x: any) => x);
    eventsRepo.save.mockResolvedValue({ id: 1, name: 'E', description: null } as any);
    const res = await service.create({ name: 'E' } as any);
    expect((res as any).id).toBe(1);
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
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  } as any;
}
