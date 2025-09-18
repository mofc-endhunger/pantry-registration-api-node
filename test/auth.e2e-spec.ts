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
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'TestPassword123',
        phone: '5551234567',
      })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('identification_code');
  });

  it('/auth/login (POST) logs in a user', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'loginuser@example.com',
      password: 'TestPassword123',
      phone: '5551234567',
    });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'loginuser@example.com',
        password: 'TestPassword123',
      })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
  });

  it('/auth/request-password-reset (POST) requests a password reset', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'resetuser@example.com',
      password: 'TestPassword123',
      phone: '5551234567',
    });
    const res = await request(app.getHttpServer())
      .post('/auth/request-password-reset')
      .send({ email: 'resetuser@example.com' })
      .expect(201);
    expect(res.body).toHaveProperty('message');
  });
});
