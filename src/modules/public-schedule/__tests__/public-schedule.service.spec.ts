import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { PublicScheduleService } from '../public-schedule.service';
import { PublicEventSlot } from '../../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../../entities-public/event-date.public.entity';

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

describe('PublicScheduleService', () => {
  let service: PublicScheduleService;
  let slotsRepo: jest.Mocked<Repository<PublicEventSlot>>;
  let datesRepo: jest.Mocked<Repository<PublicEventDate>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicScheduleService,
        {
          provide: getRepositoryToken(PublicEventSlot, 'public'),
          useValue: createRepoMock<PublicEventSlot>(),
        },
        {
          provide: getRepositoryToken(PublicEventDate, 'public'),
          useValue: createRepoMock<PublicEventDate>(),
        },
      ],
    }).compile();

    service = moduleRef.get(PublicScheduleService);
    slotsRepo = moduleRef.get(getRepositoryToken(PublicEventSlot, 'public'));
    datesRepo = moduleRef.get(getRepositoryToken(PublicEventDate, 'public'));
  });

  it('incrementSlotAndDate increments both when available', async () => {
    slotsRepo.findOne.mockResolvedValue({ event_slot_id: 10, reserved: 1 } as any);
    slotsRepo.query
      .mockResolvedValueOnce([{ event_hour_id: 5 }] as any) // event_slots -> hour
      .mockResolvedValueOnce([{ event_date_id: 7 }] as any); // event_hours -> date
    datesRepo.findOne.mockResolvedValue({ event_date_id: 7, reserved: 2 } as any);

    await service.incrementSlotAndDate(10);

    expect(slotsRepo.update).toHaveBeenCalledWith({ event_slot_id: 10 }, { reserved: 2 });
    expect(datesRepo.update).toHaveBeenCalledWith({ event_date_id: 7 }, { reserved: 3 });
  });

  it('decrementSlotAndDate decrements and does not go below zero', async () => {
    slotsRepo.findOne.mockResolvedValue({ event_slot_id: 11, reserved: 0 } as any);
    slotsRepo.query
      .mockResolvedValueOnce([{ event_hour_id: 6 }] as any)
      .mockResolvedValueOnce([{ event_date_id: 8 }] as any);
    datesRepo.findOne.mockResolvedValue({ event_date_id: 8, reserved: 0 } as any);

    await service.decrementSlotAndDate(11);

    expect(slotsRepo.update).toHaveBeenCalledWith({ event_slot_id: 11 }, { reserved: 0 });
    expect(datesRepo.update).toHaveBeenCalledWith({ event_date_id: 8 }, { reserved: 0 });
  });

  it('incrementDate increments when date exists', async () => {
    datesRepo.findOne.mockResolvedValue({ event_date_id: 12, reserved: 4 } as any);
    await service.incrementDate(12);
    expect(datesRepo.update).toHaveBeenCalledWith({ event_date_id: 12 }, { reserved: 5 });
  });

  it('decrementDate decrements and clamps to zero', async () => {
    datesRepo.findOne.mockResolvedValue({ event_date_id: 13, reserved: 0 } as any);
    await service.decrementDate(13);
    expect(datesRepo.update).toHaveBeenCalledWith({ event_date_id: 13 }, { reserved: 0 });
  });

  it('getEventDateIdForDate returns id when found via raw query', async () => {
    datesRepo.query.mockResolvedValueOnce([{ event_date_id: 99 }] as any);
    const id = await service.getEventDateIdForDate(1, '2025-11-05');
    expect(id).toBe(99);
  });

  it('getEventDateIdDefault prefers upcoming else recent', async () => {
    // No upcoming
    datesRepo.query
      .mockResolvedValueOnce([] as any) // upcoming
      .mockResolvedValueOnce([{ event_date_id: 77 }] as any); // recent
    const id = await service.getEventDateIdDefault(1);
    expect(id).toBe(77);
  });

	it('getEventDateIdDefault returns upcoming when present', async () => {
		// upcoming exists
		datesRepo.query
			.mockResolvedValueOnce([{ event_date_id: 123 }] as any) // upcoming
			.mockResolvedValueOnce([] as any); // recent not used
		const id = await service.getEventDateIdDefault(1);
		expect(id).toBe(123);
	});

	it('incrementSlotAndDate returns early when slot not found', async () => {
		slotsRepo.findOne.mockResolvedValue(null as any);
		await service.incrementSlotAndDate(999);
		expect(slotsRepo.update).not.toHaveBeenCalled();
	});

	it('decrementSlotAndDate returns early when slot not found', async () => {
		slotsRepo.findOne.mockResolvedValue(null as any);
		await service.decrementSlotAndDate(999);
		expect(slotsRepo.update).not.toHaveBeenCalled();
	});

	it('buildEventDateStructure returns {event_date:null} when not found', async () => {
		datesRepo.query.mockResolvedValueOnce([] as any);
		const res = await service.buildEventDateStructure(55);
		expect(res).toEqual({ event_date: null });
	});

	it('buildEventDateStructure assembles hours and slots and formats date', async () => {
		// dateRow with key 20251105
		datesRepo.query
			.mockResolvedValueOnce([{ id: 1, event_id: 2, capacity: 100, reserved: 10, event_date_key: 20251105 }] as any)
			.mockResolvedValueOnce([{ event_hour_id: 50, event_date_id: 1, capacity: null }] as any);
		// slots for hour 50
		slotsRepo.query.mockResolvedValueOnce([
			{ event_slot_id: 500, event_hour_id: 50, capacity: 5, reserved: 2 },
			{ event_slot_id: 501, event_hour_id: 50, capacity: 10, reserved: 3 },
		] as any);
		const res = await service.buildEventDateStructure(1);
		expect(res.event_date).toBeTruthy();
		const ed = res.event_date as any;
		expect(ed.date).toBe('2025-11-05');
		expect(ed.event_hours[0].event_slots.length).toBe(2);
		expect(ed.open_slots).toBe(10); // (5-2)+(10-3)=10
	});
});
