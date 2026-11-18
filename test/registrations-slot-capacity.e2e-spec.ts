import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Event } from '../src/entities/event.entity';
import { Registration } from '../src/entities/registration.entity';
import { PublicEventDate } from '../src/entities-public/event-date.public.entity';
import { PublicEventHour } from '../src/entities-public/event-hour.public.entity';
import { PublicEventSlot } from '../src/entities-public/event-slot.public.entity';
import { getGuestToken } from './helpers/auth';

/**
 * SUP-1169 / SUP-1170: a burst of bookings must never take more places than a
 * slot or its date has, and a full slot answers 409 SLOT_FULL with nothing
 * saved (there is no waitlist). These run on real MySQL on purpose: the old
 * code read `reserved`, decided, then wrote `reserved + 1` from the stale
 * read, so parallel requests all fitted into the last place. A mocked unit
 * test can never show that.
 */
describe('Slot capacity under concurrent bookings (SUP-1169, E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let regsRepo: Repository<Registration>;
  let datesRepo: Repository<PublicEventDate>;
  let hoursRepo: Repository<PublicEventHour>;
  let slotsRepo: Repository<PublicEventSlot>;
  let phoneSeq = 0;

  const server = () => app.getHttpServer();

  /** A private event with one public date, one hour and one slot. */
  async function seed(opts: { dateCapacity: number; slotCapacity: number }) {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: `Burst ${Date.now()}`, is_active: true, capacity: null } as any),
    );
    const eventId = (event as unknown as Event).id;
    const date = await datesRepo.save(
      datesRepo.create({ event_id: eventId, capacity: opts.dateCapacity, reserved: 0 }),
    );
    const hour = await hoursRepo.save(hoursRepo.create({ event_date_id: date.event_date_id }));
    const slot = await slotsRepo.save(
      slotsRepo.create({
        event_hour_id: hour.event_hour_id,
        capacity: opts.slotCapacity,
        reserved: 0,
      }),
    );
    return { eventId, dateId: date.event_date_id, slotId: slot.event_slot_id };
  }

  /** N distinct guests, each with their own token. */
  async function guests(n: number): Promise<string[]> {
    const tokens: string[] = [];
    for (let i = 0; i < n; i++) {
      phoneSeq += 1;
      tokens.push(await getGuestToken(app, `555${String(4000000 + phoneSeq).padStart(7, '0')}`));
    }
    return tokens;
  }

  const book = (token: string, body: Record<string, number>) =>
    request(server()).post('/registrations').set('X-Guest-Token', token).send(body);

  const reservedOf = async (slotId: number, dateId: number) => ({
    slot: (await slotsRepo.findOneByOrFail({ event_slot_id: slotId })).reserved,
    date: (await datesRepo.findOneByOrFail({ event_date_id: dateId })).reserved,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
    regsRepo = app.get(getRepositoryToken(Registration));
    datesRepo = app.get(getRepositoryToken(PublicEventDate, 'public'));
    hoursRepo = app.get(getRepositoryToken(PublicEventHour, 'public'));
    slotsRepo = app.get(getRepositoryToken(PublicEventSlot, 'public'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('gives a burst of 20 bookings exactly the 5 places a slot has', async () => {
    const { eventId, dateId, slotId } = await seed({ dateCapacity: 100, slotCapacity: 5 });
    const tokens = await guests(20);

    const results = await Promise.all(
      tokens.map((t) =>
        book(t, { event_id: eventId, event_slot_id: slotId, event_date_id: dateId }),
      ),
    );

    const ok = results.filter((r) => r.status === 201);
    const full = results.filter((r) => r.status === 409);
    expect(ok).toHaveLength(5);
    expect(full).toHaveLength(15);
    for (const r of full) {
      expect(r.body.code).toBe('SLOT_FULL');
      expect(String(r.body.message)).toContain('at capacity');
    }
    expect(await reservedOf(slotId, dateId)).toEqual({ slot: 5, date: 5 });
    // Nothing is saved for a refused booking: no waitlist.
    const rows = await regsRepo.find({ where: { public_event_slot_id: slotId } as any });
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.status === 'confirmed')).toBe(true);
  });

  it("refuses a slot with room once its date is full, and gives the slot's place back", async () => {
    const { eventId, dateId, slotId } = await seed({ dateCapacity: 2, slotCapacity: 5 });
    const tokens = await guests(4);

    const results = await Promise.all(
      tokens.map((t) =>
        book(t, { event_id: eventId, event_slot_id: slotId, event_date_id: dateId }),
      ),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await reservedOf(slotId, dateId)).toEqual({ slot: 2, date: 2 });
  });

  it('gives a burst on a date without slots exactly its capacity', async () => {
    const { eventId, dateId, slotId } = await seed({ dateCapacity: 3, slotCapacity: 5 });
    const tokens = await guests(8);

    const results = await Promise.all(
      tokens.map((t) => book(t, { event_id: eventId, event_date_id: dateId })),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await reservedOf(slotId, dateId)).toEqual({ slot: 0, date: 3 });
  });

  it('answers 404 for a slot that does not exist, and saves nothing', async () => {
    const { eventId } = await seed({ dateCapacity: 10, slotCapacity: 10 });
    const [token] = await guests(1);
    await book(token, { event_id: eventId, event_slot_id: 987654321 }).expect(404);
    expect(await regsRepo.count({ where: { event_id: eventId } as any })).toBe(0);
  });

  it('gives a place back once when the same booking is cancelled twice at once', async () => {
    const { eventId, dateId, slotId } = await seed({ dateCapacity: 10, slotCapacity: 10 });
    const [a, b] = await guests(2);
    const first = await book(a, {
      event_id: eventId,
      event_slot_id: slotId,
      event_date_id: dateId,
    });
    await book(b, { event_id: eventId, event_slot_id: slotId, event_date_id: dateId }).expect(201);
    expect(await reservedOf(slotId, dateId)).toEqual({ slot: 2, date: 2 });

    const cancel = () =>
      request(server())
        .patch(`/registrations/${first.body.id}/cancel`)
        .set('X-Guest-Token', a)
        .send();
    const [c1, c2] = await Promise.all([cancel(), cancel()]);
    expect([c1.status, c2.status].every((s) => s === 200)).toBe(true);
    expect(await reservedOf(slotId, dateId)).toEqual({ slot: 1, date: 1 });
  });
});
