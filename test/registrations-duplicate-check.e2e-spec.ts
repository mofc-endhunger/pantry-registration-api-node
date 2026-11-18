import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Event } from '../src/entities/event.entity';
import { Registration } from '../src/entities/registration.entity';
import { getGuestToken } from './helpers/auth';

/**
 * SUP-1171 (cleanup from SUP-1170): only a booking that holds a place blocks a
 * second one. There is no waitlist any more, so an old `waitlisted` row is not
 * a booking: it used to answer "Already registered" and keep that household
 * from ever getting a real place on that date.
 */
describe('Already-registered check counts only bookings that hold a place (SUP-1171, E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let regsRepo: Repository<Registration>;
  let phone = 5553000000;

  const book = (token: string, eventId: number) =>
    request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', token)
      .send({ event_id: eventId });

  /** A guest with one booking on a fresh event, its row then set to `status`. */
  async function guestWithBooking(status: Registration['status']) {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: `Dup ${status} ${Date.now()}`, is_active: true } as any),
    );
    const eventId = (event as unknown as Event).id;
    phone += 1;
    const token = await getGuestToken(app, String(phone));
    const first = await book(token, eventId).expect(201);
    await regsRepo.update({ id: first.body.id }, { status } as any);
    return { token, eventId };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
    regsRepo = app.get(getRepositoryToken(Registration));
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a household with an old waitlisted row book a real place', async () => {
    const { token, eventId } = await guestWithBooking('waitlisted');
    const res = await book(token, eventId).expect(201);
    expect(res.body.status).toBe('confirmed');
  });

  it('lets a household whose booking was cancelled book again', async () => {
    const { token, eventId } = await guestWithBooking('cancelled');
    await book(token, eventId).expect(201);
  });

  it.each(['confirmed', 'checked_in'] as const)(
    'still answers "Already registered" while a %s booking holds a place',
    async (status) => {
      const { token, eventId } = await guestWithBooking(status);
      const res = await book(token, eventId).expect(400);
      expect(String(res.body.message)).toContain('Already registered');
    },
  );
});
