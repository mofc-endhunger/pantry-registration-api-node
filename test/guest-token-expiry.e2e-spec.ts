import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Authentication } from '../src/entities/authentication.entity';
import { Event } from '../src/entities/event.entity';

describe('Guest token expiry (E2E)', () => {
  let app: INestApplication;
  let authRepo: Repository<Authentication>;
  let eventsRepo: Repository<Event>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    authRepo = app.get(getRepositoryToken(Authentication));
    eventsRepo = app.get(getRepositoryToken(Event));
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an expired guest token', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Expired Token Event', is_active: true } as any),
    );
    const guest = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5553000000' })
      .expect(201);
    const token = guest.body.token as string;
    // Expire it in DB
    const record = await authRepo.findOne({ where: { token } });
    expect(record).toBeTruthy();
    await authRepo.update({ id: (record as any).id }, { expires_at: new Date(Date.now() - 60_000) } as any);

    const res = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', token)
      .send({ event_id: (event as any).id });
    expect([401, 403]).toContain(res.status);
  });
});

