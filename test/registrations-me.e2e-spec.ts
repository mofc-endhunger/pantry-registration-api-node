import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';

describe('GET /registrations/me (E2E)', () => {
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

  it("returns the guest user's registrations", async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'ME Event', is_active: true } as any),
    );
    const guest = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5553334444' })
      .expect(201);
    const token = guest.body.token as string;

    await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', token)
      .send({ event_id: (event as any).id })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/registrations/me')
      .set('X-Guest-Token', token)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });
});
