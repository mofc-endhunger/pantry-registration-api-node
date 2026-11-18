import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SLOT_FULL } from '../../../common/utils/slot-full';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { PublicScheduleService } from '../public-schedule.service';
import { PublicEventSlot } from '../../../entities-public/event-slot.public.entity';
import { PublicEventDate } from '../../../entities-public/event-date.public.entity';
import { PublicEvent } from '../../../entities-public/event.public.entity';
import { PublicEventHour } from '../../../entities-public/event-hour.public.entity';
import { PublicDimTime } from '../../../entities-public/dim-time.public.entity';

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
  let hoursRepo: jest.Mocked<Repository<PublicEventHour>>;
  let _dimTimesRepo: jest.Mocked<Repository<PublicDimTime>>;
  let _eventsRepo: jest.Mocked<Repository<PublicEvent>>;

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
        {
          provide: getRepositoryToken(PublicEventHour, 'public'),
          useValue: createRepoMock<PublicEventHour>(),
        },
        {
          provide: getRepositoryToken(PublicDimTime, 'public'),
          useValue: createRepoMock<PublicDimTime>(),
        },
        {
          provide: getRepositoryToken(PublicEvent, 'public'),
          useValue: createRepoMock<PublicEvent>(),
        },
      ],
    }).compile();

    service = moduleRef.get(PublicScheduleService);
    slotsRepo = moduleRef.get(getRepositoryToken(PublicEventSlot, 'public'));
    datesRepo = moduleRef.get(getRepositoryToken(PublicEventDate, 'public'));
    hoursRepo = moduleRef.get(getRepositoryToken(PublicEventHour, 'public'));
    _dimTimesRepo = moduleRef.get(getRepositoryToken(PublicDimTime, 'public'));
    _eventsRepo = moduleRef.get(getRepositoryToken(PublicEvent, 'public'));
  });

  describe('holding and releasing places (SUP-1169)', () => {
    /** The UPDATE statements a repo was sent, whitespace collapsed. */
    const sqlSentTo = (repo: jest.Mocked<Repository<any>>) =>
      repo.query.mock.calls.map(([sql, params]) => ({
        sql: String(sql).replace(/\s+/g, ' ').trim(),
        params,
      }));
    const changed = (n: number) => ({ affectedRows: n });

    beforeEach(() => {
      (slotsRepo as any).metadata = { tablePath: 'freshtrak_public.event_slots' };
      (datesRepo as any).metadata = { tablePath: 'freshtrak_public.event_dates' };
      slotsRepo.findOne.mockResolvedValue({ event_slot_id: 10, event_hour_id: 5 } as any);
      hoursRepo.findOne.mockResolvedValue({ event_hour_id: 5, event_date_id: 7 } as any);
      datesRepo.findOne.mockResolvedValue({ event_date_id: 7 } as any);
    });

    it('claims the slot and its date, each in one conditional UPDATE', async () => {
      slotsRepo.query.mockResolvedValueOnce(changed(1));
      datesRepo.query.mockResolvedValueOnce(changed(1));

      await expect(service.holdPlace({ slotId: 10 })).resolves.toEqual({ slotId: 10, dateId: 7 });

      expect(sqlSentTo(slotsRepo)).toEqual([
        {
          sql:
            'UPDATE freshtrak_public.event_slots SET reserved = COALESCE(reserved, 0) + 1 ' +
            'WHERE event_slot_id = ? AND capacity > 0 AND COALESCE(reserved, 0) < capacity',
          params: [10],
        },
      ]);
      expect(sqlSentTo(datesRepo)).toEqual([
        {
          sql:
            'UPDATE freshtrak_public.event_dates SET reserved = COALESCE(reserved, 0) + 1 ' +
            'WHERE event_date_id = ? AND (capacity IS NULL OR capacity <= 0 OR COALESCE(reserved, 0) < capacity)',
          params: [7],
        },
      ]);
      // Never read-then-write: no TypeORM update() with a value computed in JS.
      expect(slotsRepo.update).not.toHaveBeenCalled();
      expect(datesRepo.update).not.toHaveBeenCalled();
    });

    it('throws 409 SLOT_FULL when the slot has no place, and touches nothing else', async () => {
      slotsRepo.query.mockResolvedValueOnce(changed(0));
      const err = await service.holdPlace({ slotId: 10 }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toEqual(
        expect.objectContaining({ code: SLOT_FULL }),
      );
      expect(datesRepo.query).not.toHaveBeenCalled();
    });

    it("gives the slot's place back when its date is full", async () => {
      slotsRepo.query.mockResolvedValueOnce(changed(1)).mockResolvedValueOnce(changed(1));
      datesRepo.query.mockResolvedValueOnce(changed(0));

      await expect(service.holdPlace({ slotId: 10 })).rejects.toBeInstanceOf(ConflictException);

      const [, release] = sqlSentTo(slotsRepo);
      expect(release).toEqual({
        sql:
          'UPDATE freshtrak_public.event_slots SET reserved = GREATEST(COALESCE(reserved, 0) - 1, 0) ' +
          'WHERE event_slot_id = ?',
        params: [10],
      });
    });

    it('answers 404 for an unknown slot or date', async () => {
      slotsRepo.findOne.mockResolvedValueOnce(null as any);
      await expect(service.holdPlace({ slotId: 999 })).rejects.toBeInstanceOf(NotFoundException);
      datesRepo.findOne.mockResolvedValueOnce(null as any);
      await expect(service.holdPlace({ dateId: 999 })).rejects.toBeInstanceOf(NotFoundException);
      expect(slotsRepo.query).not.toHaveBeenCalled();
      expect(datesRepo.query).not.toHaveBeenCalled();
    });

    it('holds a date-only booking on the date alone', async () => {
      datesRepo.query.mockResolvedValueOnce(changed(1));
      await expect(service.holdPlace({ dateId: 7 })).resolves.toEqual({ slotId: null, dateId: 7 });
      expect(slotsRepo.query).not.toHaveBeenCalled();
    });

    it('holds nothing for a booking with neither slot nor date', async () => {
      await expect(service.holdPlace({})).resolves.toEqual({ slotId: null, dateId: null });
      expect(slotsRepo.query).not.toHaveBeenCalled();
      expect(datesRepo.query).not.toHaveBeenCalled();
    });

    it('releases what was held, never below 0', async () => {
      slotsRepo.query.mockResolvedValue(changed(1));
      datesRepo.query.mockResolvedValue(changed(1));
      await service.releasePlace({ slotId: 10, dateId: 7 });
      expect(sqlSentTo(slotsRepo)[0].sql).toContain('GREATEST(COALESCE(reserved, 0) - 1, 0)');
      expect(sqlSentTo(datesRepo)[0]).toEqual({
        sql:
          'UPDATE freshtrak_public.event_dates SET reserved = GREATEST(COALESCE(reserved, 0) - 1, 0) ' +
          'WHERE event_date_id = ?',
        params: [7],
      });
    });

    it("works out what a stored booking holds from its slot's date", async () => {
      await expect(
        service.placeHeldBy({ public_event_slot_id: 10, public_event_date_id: 99 }),
      ).resolves.toEqual({ slotId: 10, dateId: 7 });
      await expect(
        service.placeHeldBy({ public_event_slot_id: null, public_event_date_id: 99 }),
      ).resolves.toEqual({ slotId: null, dateId: 99 });
    });
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

  it('buildEventDateStructure returns {event_date:null} when not found', async () => {
    datesRepo.query.mockResolvedValueOnce([] as any);
    const res = await service.buildEventDateStructure(55);
    expect(res).toEqual({ event_date: null });
  });

  it('buildEventDateStructure assembles hours and slots and formats date', async () => {
    // dateRow with key 20251105
    datesRepo.query
      .mockResolvedValueOnce([
        { id: 1, event_id: 2, capacity: 100, reserved: 10, event_date_key: 20251105 },
      ] as any)
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

  describe('getEventContactDetails', () => {
    it('joins events to locations and maps the row', async () => {
      _eventsRepo.query.mockResolvedValue([
        {
          event_name: 'Food Pantry',
          address1: '1234 Broad St',
          address2: '',
          city: 'Columbus',
          state: 'OH',
          zip: '43215',
          pub_desc_long: '<p>Side door</p>',
          loc_name: 'Bread of Life Choice Pantry',
          phone: '6145550142',
        },
      ] as any);

      const details = await service.getEventContactDetails(42);

      const [sql, params] = _eventsRepo.query.mock.calls[0];
      expect(sql).toMatch(/FROM events e\s+LEFT JOIN locations l ON l\.loc_id = e\.loc_id/);
      expect(params).toEqual([42]);
      expect(details).toEqual({
        eventName: 'Food Pantry',
        address1: '1234 Broad St',
        address2: null, // blank columns come back as null
        city: 'Columbus',
        state: 'OH',
        zip: '43215',
        instructions: '<p>Side door</p>',
        agencyName: 'Bread of Life Choice Pantry',
        agencyPhone: '6145550142',
      });
    });

    it('returns null when the event does not exist', async () => {
      _eventsRepo.query.mockResolvedValue([] as any);
      await expect(service.getEventContactDetails(42)).resolves.toBeNull();
    });

    it('returns null instead of throwing when the query fails', async () => {
      _eventsRepo.query.mockRejectedValue(new Error("Unknown column 'e.address1'"));
      await expect(service.getEventContactDetails(42)).resolves.toBeNull();
    });
  });
});
