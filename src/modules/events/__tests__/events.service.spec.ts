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

	it('list applies active/from/to filters and orders', async () => {
		await service.list({ active: true, from: '2025-01-01', to: '2025-12-31' });
		const results = (eventsRepo.createQueryBuilder as jest.Mock).mock.results;
		const qb = results[results.length - 1].value;
		expect(qb.andWhere).toHaveBeenCalledTimes(3);
		expect(qb.orderBy).toHaveBeenCalled();
		expect(qb.addOrderBy).toHaveBeenCalled();
		expect(qb.getMany).toHaveBeenCalled();
	});

	it('get throws when event not found', async () => {
		eventsRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.get(99)).rejects.toThrow('Event not found');
	});

	it('update modifies provided fields and saves', async () => {
		const existing: any = { id: 1, name: 'A' };
		eventsRepo.findOne.mockResolvedValueOnce(existing);
		eventsRepo.save.mockImplementation(async (e: any) => e);
		const res = await service.update(1, { name: 'B', capacity: 10, is_active: false } as any);
		expect(res.name).toBe('B');
		expect(res.capacity).toBe(10);
		expect(res.is_active).toBe(false);
	});

	it('remove loads and removes event', async () => {
		eventsRepo.findOne.mockResolvedValueOnce({ id: 7 } as any);
		await service.remove(7);
		expect(eventsRepo.remove).toHaveBeenCalledWith({ id: 7 });
	});

	it('listTimeslots returns timeslots for event', async () => {
		timeslotsRepo.find.mockResolvedValueOnce([{ id: 1 }] as any);
		const res = await service.listTimeslots(3);
		expect(timeslotsRepo.find).toHaveBeenCalledWith({ where: { event_id: 3 } });
		expect(res).toEqual([{ id: 1 }]);
	});

	it('createTimeslot maps dto and saves', async () => {
		timeslotsRepo.create.mockImplementation((x: any) => x);
		timeslotsRepo.save.mockResolvedValueOnce({ id: 2 } as any);
		const res = await service.createTimeslot({ event_id: 1, start_at: '2025-01-01', end_at: '2025-01-01', capacity: 5, is_active: true } as any);
		expect((res as any).id).toBe(2);
	});

	it('updateTimeslot throws when not found', async () => {
		timeslotsRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.updateTimeslot(99, { capacity: 1 } as any)).rejects.toThrow('Timeslot not found');
	});

	it('updateTimeslot modifies provided fields and saves', async () => {
		const slot: any = { id: 5, capacity: 1 };
		timeslotsRepo.findOne.mockResolvedValueOnce(slot);
		timeslotsRepo.save.mockImplementation(async (s: any) => s);
		const res = await service.updateTimeslot(5, { capacity: 10, is_active: false } as any);
		expect(res.capacity).toBe(10);
		expect(res.is_active).toBe(false);
	});

	it('removeTimeslot loads and removes slot', async () => {
		timeslotsRepo.findOne.mockResolvedValueOnce({ id: 6 } as any);
		await service.removeTimeslot(6);
		expect(timeslotsRepo.remove).toHaveBeenCalledWith({ id: 6 });
	});

	it('create maps start_at/end_at when provided', async () => {
		eventsRepo.create.mockImplementation((x: any) => x);
		eventsRepo.save.mockResolvedValue({ id: 2 } as any);
		await service.create({ name: 'E', start_at: '2025-01-01', end_at: '2025-01-02' } as any);
		expect(eventsRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				start_at: expect.any(Date),
				end_at: expect.any(Date),
			}),
		);
	});

	it('update maps start_at null and end_at date', async () => {
		const existing: any = { id: 3 };
		eventsRepo.findOne.mockResolvedValueOnce(existing);
		eventsRepo.save.mockImplementation(async (e: any) => e);
		const res = await service.update(3, { start_at: null, end_at: '2025-02-02' } as any);
		expect(res.start_at).toBeNull();
		expect(res.end_at).toBeInstanceOf(Date);
	});

	it('updateTimeslot maps start_at/end_at when provided', async () => {
		const slot: any = { id: 8 };
		timeslotsRepo.findOne.mockResolvedValueOnce(slot);
		timeslotsRepo.save.mockImplementation(async (s: any) => s);
		const res = await service.updateTimeslot(8, { start_at: '2025-03-01', end_at: '2025-03-02' } as any);
		expect(res.start_at).toBeInstanceOf(Date);
		expect(res.end_at).toBeInstanceOf(Date);
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
