import request from 'supertest';
import { INestApplication } from '@nestjs/common';

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
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(201);
  return res.body.access_token as string;
}
