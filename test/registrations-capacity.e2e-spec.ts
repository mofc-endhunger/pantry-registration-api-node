import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';
import { Registration } from '../src/entities/registration.entity';
import { EventTimeslot } from '../src/entities/event-timeslot.entity';

describe('Registrations capacity/waitlist (E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let regsRepo: Repository<Registration>;
  let timesRepo: Repository<EventTimeslot>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
    regsRepo = app.get(getRepositoryToken(Registration));
    timesRepo = app.get(getRepositoryToken(EventTimeslot));
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces capacity, waitlists overflow, and promotes on cancel', async () => {
    // Capacity is enforced per slot/date/timeslot. Event-level `capacity` is ignored when
    // none is given (unbounded since f3d2ed81), so use a local timeslot with capacity 1.
    const event = await eventsRepo.save(
      eventsRepo.create({ name: 'Capacity Event', is_active: true } as any),
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

    // A confirmed registration on another event must not count against this timeslot.
    const other = await eventsRepo.save(
      eventsRepo.create({ name: 'Other Event', is_active: true } as any),
    );
    const guestOther = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5551000003' })
      .expect(201);
    const otherReg = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', guestOther.body.token as string)
      .send({ event_id: (other as any).id })
      .expect(201);
    expect(otherReg.body.status).toBe('confirmed');

    // Guest A
    const guestA = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5551000001' })
      .expect(201);
    const tokenA = guestA.body.token as string;

    // Guest B
    const guestB = await request(app.getHttpServer())
      .post('/guest-authentications')
      .send({ phone: '5551000002' })
      .expect(201);
    const tokenB = guestB.body.token as string;

    // First registration (A) gets confirmed
    const regA = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', tokenA)
      .send({ event_id: (event as any).id, timeslot_id: (slot as any).id })
      .expect(201);
    expect(regA.body.status).toBe('confirmed');

    // Second registration (B) gets waitlisted
    const regB = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', tokenB)
      .send({ event_id: (event as any).id, timeslot_id: (slot as any).id })
      .expect(201);
    expect(regB.body.status).toBe('waitlisted');

    // Cancel A -> B should be promoted to confirmed
    await request(app.getHttpServer())
      .patch(`/registrations/${regA.body.id}/cancel`)
      .set('X-Guest-Token', tokenA)
      .expect(200);
    const refreshedB = await regsRepo.findOne({ where: { id: regB.body.id } });
    expect(refreshedB?.status).toBe('confirmed');
  });
});
