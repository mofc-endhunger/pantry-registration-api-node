import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Event } from '../src/entities/event.entity';
import { Registration } from '../src/entities/registration.entity';
import { PublicEventDate } from '../src/entities-public/event-date.public.entity';
import { PublicEventHour } from '../src/entities-public/event-hour.public.entity';
import { PublicEventSlot } from '../src/entities-public/event-slot.public.entity';
import { getGuestToken } from './helpers/auth';

/**
 * SUP-1171: one household sending the same booking several times at once (a
 * double tap, or a retry after a timeout while the first is still running)
 * gets exactly one booking. The "Already registered" check used to be a plain
 * read before the save, so simultaneous requests all passed it and each saved
 * a row and took a place. Real MySQL on purpose: a mocked repository cannot
 * race.
 *
 * Every refused request answers the usual "Already registered" 400 and carries
 * the booking that won, so a retrying client can show its confirmation.
 */
describe('Simultaneous duplicate bookings from one household (SUP-1171, E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let regsRepo: Repository<Registration>;
  let datesRepo: Repository<PublicEventDate>;
  let hoursRepo: Repository<PublicEventHour>;
  let slotsRepo: Repository<PublicEventSlot>;
  let phoneSeq = 0;

  const BURST = 6;

  /** A private event with one public date, one hour and one slot, all roomy. */
  async function seed() {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: `Dup burst ${Date.now()}`, is_active: true } as any),
    );
    const eventId = (event as unknown as Event).id;
    const date = await datesRepo.save(
      datesRepo.create({ event_id: eventId, capacity: 50, reserved: 0 }),
    );
    const hour = await hoursRepo.save(hoursRepo.create({ event_date_id: date.event_date_id }));
    const slot = await slotsRepo.save(
      slotsRepo.create({ event_hour_id: hour.event_hour_id, capacity: 50, reserved: 0 }),
    );
    return { eventId, dateId: date.event_date_id, slotId: slot.event_slot_id };
  }

  async function guest(): Promise<string> {
    phoneSeq += 1;
    return getGuestToken(app, `555${String(6000000 + phoneSeq).padStart(7, '0')}`);
  }

  const book = (token: string, body: Record<string, number>) =>
    request(app.getHttpServer()).post('/registrations').set('X-Guest-Token', token).send(body);

  const placeHolding = (eventId: number) =>
    regsRepo.find({
      where: { event_id: eventId, status: In(['confirmed', 'checked_in']) } as any,
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

  it('saves one booking and takes one place for a burst on a slot', async () => {
    const { eventId, dateId, slotId } = await seed();
    const token = await guest();
    const body = { event_id: eventId, event_date_id: dateId, event_slot_id: slotId };

    const results = await Promise.all(Array.from({ length: BURST }, () => book(token, body)));

    const ok = results.filter((r) => r.status === 201);
    const dup = results.filter((r) => r.status === 400);
    expect(ok).toHaveLength(1);
    expect(dup).toHaveLength(BURST - 1);
    const winnerId = Number(ok[0].body.id);
    for (const r of dup) {
      expect(String(r.body.message)).toContain('Already registered');
      expect(r.body.code).toBe('ALREADY_REGISTERED');
      expect(Number(r.body.registration?.id)).toBe(winnerId);
    }

    const rows = await placeHolding(eventId);
    expect(rows.map((r) => Number(r.id))).toEqual([winnerId]);
    expect((await slotsRepo.findOneByOrFail({ event_slot_id: slotId })).reserved).toBe(1);
    expect((await datesRepo.findOneByOrFail({ event_date_id: dateId })).reserved).toBe(1);
  });

  it('saves one booking for a burst on an event without a date', async () => {
    const { eventId } = await seed();
    const token = await guest();

    const results = await Promise.all(
      Array.from({ length: BURST }, () => book(token, { event_id: eventId })),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 400)).toHaveLength(BURST - 1);
    expect(await placeHolding(eventId)).toHaveLength(1);
  });

  it('answers a later resubmit with the booking it already has', async () => {
    const { eventId, dateId, slotId } = await seed();
    const token = await guest();
    const body = { event_id: eventId, event_date_id: dateId, event_slot_id: slotId };
    const first = await book(token, body).expect(201);

    const again = await book(token, body).expect(400);

    // The booking in the 400 has the shape the 201 had, field for field.
    expect(again.body).toMatchObject({
      message: 'Already registered',
      code: 'ALREADY_REGISTERED',
      registration: {
        id: first.body.id,
        event_id: first.body.event_id,
        public_event_date_id: dateId,
        public_event_slot_id: slotId,
        status: 'confirmed',
      },
    });
    expect((await slotsRepo.findOneByOrFail({ event_slot_id: slotId })).reserved).toBe(1);
  });

  it('still lets two households book the same slot at the same moment', async () => {
    const { eventId, dateId, slotId } = await seed();
    const [a, b] = [await guest(), await guest()];
    const body = { event_id: eventId, event_date_id: dateId, event_slot_id: slotId };

    const results = await Promise.all([book(a, body), book(b, body)]);

    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(await placeHolding(eventId)).toHaveLength(2);
  });
});
