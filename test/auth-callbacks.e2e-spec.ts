import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthCallbacksController (e2e)', () => {
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

  it('/auth-callbacks/facebook (POST) creates or finds user and returns authentication', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth-callbacks/facebook')
      .send({
        userID: 'fb_test_user_1',
        graphDomain: 'facebook',
        accessToken: 'fake_token_123'
      })
      .expect(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('expires_at');
    expect(res.body).toHaveProperty('user_id');
  });
});
