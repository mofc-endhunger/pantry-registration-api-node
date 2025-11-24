import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';
import { CheckInAudit } from '../src/entities/checkin-audit.entity';

describe('Check-in audit (E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let auditRepo: Repository<CheckInAudit>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
    auditRepo = app.get(getRepositoryToken(CheckInAudit));
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a CheckInAudit row on check-in', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Audit Event', is_active: true } as any),
    );
    const email = `audit+${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'Pw!23456' }).expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'Pw!23456' }).expect(201);
    const jwt = login.body.access_token as string;

    const regRes = await request(app.getHttpServer())
      .post('/registrations')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ event_id: (event as any).id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/registrations/check-in')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ registration_id: regRes.body.id, attendee_ids: [] })
      .expect(200);

    const audits = await auditRepo.find({ where: { registration_id: regRes.body.id } as any });
    expect(audits.length).toBeGreaterThan(0);
  });
});

