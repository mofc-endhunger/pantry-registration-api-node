import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export function client(app: INestApplication) {
  const server = app.getHttpServer();
  return {
    guest(token: string) {
      return request(server).set('X-Guest-Token', token);
    },
    jwt(jwt: string) {
      return request(server).set('Authorization', `Bearer ${jwt}`);
    },
    raw() {
      return request(server);
    },
  };
}
