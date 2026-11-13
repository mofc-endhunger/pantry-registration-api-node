import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Event } from '../src/entities/event.entity';
import { Registration } from '../src/entities/registration.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { completeGuestProfile, getGuestToken } from './helpers/auth';

/**
 * SUP-1141 end to end: the 422 body as a client receives it, through the same
 * global pipe and filter main.ts installs.
 */
describe('Registrations: incomplete registrant (E2E)', () => {
  let app: INestApplication;
  let eventsRepo: Repository<Event>;
  let regsRepo: Repository<Registration>;
  let previousFlag: string | undefined;

  beforeAll(async () => {
    previousFlag = process.env.REQUIRE_COMPLETE_REGISTRANT;
    process.env.REQUIRE_COMPLETE_REGISTRANT = 'true';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    eventsRepo = app.get(getRepositoryToken(Event));
    regsRepo = app.get(getRepositoryToken(Registration));
  });

  afterAll(async () => {
    if (previousFlag === undefined) delete process.env.REQUIRE_COMPLETE_REGISTRANT;
    else process.env.REQUIRE_COMPLETE_REGISTRANT = previousFlag;
    await app.close();
  });

  async function newEvent(name: string): Promise<number> {
    const event = await eventsRepo.save(
      eventsRepo.create({ name, is_active: true, capacity: null } as any),
    );
    // bigint ids come back as strings; clients send a number, which the
    // global ValidationPipe requires (RegisterDto's @IsInt).
    return Number((event as any).id);
  }

  it('answers 422 with code and missing fields for a guest with no profile, and reserves nothing', async () => {
    const eventId = await newEvent('Incomplete Guest Event');
    const guestToken = await getGuestToken(app, '5550002222');

    const res = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', guestToken)
      .send({ event_id: eventId })
      .expect(422);

    expect(res.body).toEqual({
      message: 'Registrant profile is incomplete',
      error: 'UnprocessableEntityException',
      status: 422,
      code: 'INCOMPLETE_REGISTRANT',
      missing: ['first_name', 'last_name', 'address_line_1', 'zip_code'],
    });
    expect(await regsRepo.count({ where: { event_id: eventId } as any })).toBe(0);
  });

  it('lists only the short street when the rest of the profile is there', async () => {
    const eventId = await newEvent('Short Street Event');
    const guestToken = await getGuestToken(app, '5550003333');
    await completeGuestProfile(app, guestToken, { address_line_1: '1 Rd' });

    const res = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', guestToken)
      .send({ event_id: eventId })
      .expect(422);

    expect(res.body.missing).toEqual(['address_line_1']);
  });

  it('registers a guest whose profile PATCH set the fields', async () => {
    const eventId = await newEvent('Complete Guest Event');
    const guestToken = await getGuestToken(app, '5550004444');
    await completeGuestProfile(app, guestToken, { zip_code: '43215-1234' });

    const res = await request(app.getHttpServer())
      .post('/registrations')
      .set('X-Guest-Token', guestToken)
      .send({ event_id: eventId })
      .expect(201);

    expect(['confirmed', 'waitlisted']).toContain(res.body.status);
  });
});
