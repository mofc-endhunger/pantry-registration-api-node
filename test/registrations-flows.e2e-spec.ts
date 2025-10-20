import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';

describe('Registrations flows (E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
  });

  afterAll(async () => {
    await app.close();
  });

  it('guest can register and then cancel for a simple event', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Guest Flow Event', is_active: true, capacity: null } as any),
    );

    const guestRes = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5550001111' })
      .expect(201);
    const guestToken = guestRes.body.token as string;

    const regRes = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', guestToken)
      .send({ event_id: event.id })
      .expect(201);

    expect(regRes.body).toHaveProperty('id');
    expect(['confirmed', 'waitlisted']).toContain(regRes.body.status);

    await request(app.getHttpServer())
      .patch(`/registrations/${regRes.body.id}/cancel`)
      .set('X-Guest-Token', guestToken)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('cancelled');
      });
  });

  it('jwt user can register and check-in', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'JWT Flow Event', is_active: true, capacity: null } as any),
    );

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'regflow@example.com', password: 'TestPassword123', phone: '5552223333' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'regflow@example.com', password: 'TestPassword123' })
      .expect(201);
    const jwt = login.body.access_token as string;

    const regRes = await request(app.getHttpServer())
      .post('/registrations')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ event_id: event.id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/registrations/check-in')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ registration_id: regRes.body.id, attendee_ids: [] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('checked_in');
      });
  });
});
