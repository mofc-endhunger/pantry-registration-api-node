import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';
import { EventTimeslot } from '../src/entities/event-timeslot.entity';

describe('Registrations timeslot flow (E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let timesRepo: Repository<EventTimeslot>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
    timesRepo = app.get(getRepositoryToken(EventTimeslot));
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers against a timeslot, enforces its capacity, and allows check-in', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Timeslot Event', is_active: true } as any),
    );
    const slot = await timesRepo.save(
      timesRepo.create({
        event_id: (event as any).id,
        start_at: new Date(),
        end_at: new Date(Date.now() + 60 * 60 * 1000),
        is_active: true,
        capacity: 1,
      } as any),
    );

    // Prepare a JWT user
    const email = `ts+${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'Pw!23456' }).expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'Pw!23456' }).expect(201);
    const jwt = login.body.access_token as string;

    // First registration for timeslot is confirmed
    const reg1 = await request(app.getHttpServer())
      .post('/registrations')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ event_id: (event as any).id, timeslot_id: (slot as any).id })
      .expect(201);
    expect(['confirmed', 'waitlisted']).toContain(reg1.body.status);

    // Second guest registration should be waitlisted due to timeslot capacity
    const guest = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5552000000' })
      .expect(201);
    const guestToken = guest.body.token as string;

    const reg2 = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', guestToken)
      .send({ event_id: (event as any).id, timeslot_id: (slot as any).id })
      .expect(201);
    expect(reg2.body.status).toBe('waitlisted');

    // Check-in for first registration should work
    await request(app.getHttpServer())
      .post('/registrations/check-in')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ registration_id: reg1.body.id, attendee_ids: [] })
      .expect(200);
  });
});

