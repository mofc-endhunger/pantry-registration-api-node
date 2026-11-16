import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';

describe('Registrations negative flows (E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // Inactive events are accepted on purpose since f3d2ed81 (registration only checks that the
  // event exists; the public DB is the source of truth for scheduling), so the negative case
  // is an event that does not exist at all.
  it('returns 404 when registering for an event that does not exist', async () => {
    const missing = await eventsRepo.save(
      eventsRepo.create({ name: 'Deleted Event', is_active: true } as any),
    );
    await eventsRepo.delete((missing as any).id);
    const guest = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5551112222' })
      .expect(201);
    const token = guest.body.token as string;

    await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', token)
      .send({ event_id: (missing as any).id })
      .expect(404);
  });

  it('returns 400 on duplicate registration for same household/event', async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Duplicate Reg Event', is_active: true, capacity: null } as any),
    );
    const guest = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5557778888' })
      .expect(201);
    const token = guest.body.token as string;

    await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', token)
      .send({ event_id: (event as any).id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', token)
      .send({ event_id: (event as any).id })
      .expect(400);
  });

  it("returns 403 when another guest tries to cancel someone else's registration", async () => {
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Forbidden Cancel Event', is_active: true, capacity: null } as any),
    );
    // Guest A registers
    const guestA = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5550002222' })
      .expect(201);
    const tokenA = guestA.body.token as string;
    const reg = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', tokenA)
      .send({ event_id: (event as any).id })
      .expect(201);

    // Guest B attempts to cancel
    const guestB = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5550003333' })
      .expect(201);
    const tokenB = guestB.body.token as string;

    await request(app.getHttpServer())
      .patch(`/registrations/${reg.body.id}/cancel`)
      .set('X-Guest-Token', tokenB)
      .expect(403);
  });
});
