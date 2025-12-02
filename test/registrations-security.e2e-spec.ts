import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';

describe('Registrations security and tokens (E2E)', () => {
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

  it('denies access to staff-only endpoint without roles', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Staff List Event', is_active: true } as any),
    );
    const email = `staff-deny+${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'Pw!23456' }).expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'Pw!23456' }).expect(201);
    const jwt = login.body.access_token as string;
    await request(app.getHttpServer())
      .get(`/registrations/event/${(event as any).id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(403);
  });

  it('rejects invalid guest token', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Invalid Guest Token Event', is_active: true } as any),
    );
    const res = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', 'not-a-real-token')
      .send({ event_id: (event as any).id });
    expect([401, 403]).toContain(res.status);
  });
});

