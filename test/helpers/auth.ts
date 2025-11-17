import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export async function getGuestToken(app: INestApplication, phone = '5550000000'): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/guest-authentications')
    .send({ phone })
    .expect(201);
  return res.body.token as string;
}

export async function getJwt(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);
  if (process.env.USE_LOCAL_JWT === '1') {
    const secret = process.env.JWT_SECRET || 'test-secret';
    const payload = {
      sub: `test-sub-${Date.now()}`,
      email,
      username: email.split('@')[0],
    };
    return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });
  } else {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    return res.body.access_token as string;
  }
}
