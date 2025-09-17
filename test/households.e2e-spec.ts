import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Households (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let householdId: number;
  let memberId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and login to obtain JWT
    const email = `households_test_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'TestPassword123', phone: '5551234567' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'TestPassword123' })
      .expect(201);

    accessToken = loginRes.body.access_token;
    expect(accessToken).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject unauthenticated create', async () => {
    await request(app.getHttpServer()).post('/households').send({}).expect(401);
  });

  it('should create a household for the authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .post('/households')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        address_line_1: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zip_code: '43004',
        preferred_language: 'en',
        primary_first_name: 'Primary',
        primary_last_name: 'User',
        primary_phone: '5551112222',
        primary_email: `primary_${Date.now()}@example.com`,
        primary_date_of_birth: '1990-01-01',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('members');
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members.length).toBe(1);
    expect(res.body).toHaveProperty('counts');

    householdId = res.body.id;
  });

  it('should return my household via GET /households', async () => {
    const res = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.id).toBe(householdId);
    expect(res.body).toHaveProperty('members');
  });

  it('should add a child member', async () => {
    const res = await request(app.getHttpServer())
      .post(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        first_name: 'Kid',
        last_name: 'One',
        date_of_birth: '2015-01-01',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    memberId = res.body.id;
  });

  it('should list members including the new child', async () => {
    const res = await request(app.getHttpServer())
      .get(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('should reflect counts including the child', async () => {
    const res = await request(app.getHttpServer())
      .get(`/households/${householdId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('counts');
    expect(res.body.counts.children).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.total).toBeGreaterThanOrEqual(2);
  });

  it('should deactivate the child member', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/households/${householdId}/members/${memberId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('is_active');
    expect(res.body.is_active).toBe(false);
  });

  it('should update household address', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ address_line_1: '456 Oak Ave' })
      .expect(200);

    expect(res.body.address_line_1).toBe('456 Oak Ave');
  });
});

