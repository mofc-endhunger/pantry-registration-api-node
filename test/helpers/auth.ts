import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export async function getGuestToken(app: INestApplication, phone = '5550000000'): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/guest-authentications')
    .send({ phone })
    .expect(201);
  return res.body.token as string;
}

/**
 * The profile a guest's PATCH sets before they reserve: everything PantryTrak
 * needs to open the visit (SUP-1141). POST /registrations answers 422 without
 * it while REQUIRE_COMPLETE_REGISTRANT=true.
 */
export const COMPLETE_GUEST_PROFILE = {
  first_name: 'Ana',
  last_name: 'Lopez',
  address_line_1: '123 Main St',
  city: 'Columbus',
  state: 'OH',
  zip_code: '43215',
};

export async function completeGuestProfile(
  app: INestApplication,
  guestToken: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await request(app.getHttpServer())
    .patch('/guest-authentications')
    .set('X-Guest-Token', guestToken)
    .send({ ...COMPLETE_GUEST_PROFILE, ...overrides })
    .expect(200);
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
      sub: randomUUID(),
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
