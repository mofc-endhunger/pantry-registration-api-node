import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) registers a new user', async () => {
    const email = `testuser+${Date.now()}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'TestPassword123',
        phone: '5551234567',
      })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('identification_code');
  });

  it('/auth/login (POST) logs in a user', async () => {
    const email = `loginuser+${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password: 'TestPassword123',
      phone: '5551234567',
    });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'TestPassword123',
      })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
  });

  it('/auth/request-password-reset (POST) requests a password reset', async () => {
    const email = `resetuser+${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password: 'TestPassword123',
      phone: '5551234567',
    });
    const res = await request(app.getHttpServer())
      .post('/auth/request-password-reset')
      .send({ email })
      .expect(201);
    expect(res.body).toHaveProperty('message');
  });

  it('/auth/register (POST) rejects duplicate email', async () => {
    const email = `dupe+${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'TestPassword123', phone: '5551234567' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'TestPassword123', phone: '5551234567' })
      .expect(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('/auth/login (POST) rejects invalid password', async () => {
    const email = `badpw+${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'RightPass123', phone: '5551234567' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'WrongPass123' })
      .expect(401);
  });
});
