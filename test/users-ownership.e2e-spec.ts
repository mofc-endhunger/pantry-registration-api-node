import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cognitoJwt } from './helpers/jwt';

/**
 * SUP-1168: `PATCH /users/:id` trusted the path id as the requester, so any
 * signed-in user could overwrite another user's profile and household. These
 * run against real MySQL on purpose: `users.id` is BIGINT and comes back from
 * the driver as a string, which a mocked unit test cannot see.
 */
describe('Users can only change themselves (SUP-1168, E2E)', () => {
  let app: INestApplication;

  interface Account {
    token: string;
    userId: number;
    householdId: number;
    identificationCode: string;
  }

  const server = () => app.getHttpServer();

  /** Sign up a Cognito-shaped user the way the apps do: POST /users, then read /users/me. */
  async function signUp(label: string): Promise<Account> {
    const { token } = cognitoJwt({ email: `${label}+${Date.now()}@example.com` });
    await request(server())
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: label, last_name: 'Owner', city: 'Columbus' })
      .expect(201);
    const me = await request(server())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const head = (me.body.members as Array<{ user_id: string; is_head_of_household: number }>).find(
      (m) => !!m.is_head_of_household,
    );
    return {
      token,
      userId: Number(head?.user_id),
      householdId: Number(me.body.id),
      identificationCode: String(me.body.identification_code),
    };
  }

  const meOf = async (a: Account) =>
    (await request(server()).get('/users/me').set('Authorization', `Bearer ${a.token}`).expect(200))
      .body as { city: string | null; members: Array<{ first_name: string }> };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a user update their own profile', async () => {
    const a = await signUp('selfedit');
    await request(server())
      .patch(`/users/${a.userId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ household_id: a.householdId, city: 'Dayton' })
      .expect(200);
    expect((await meOf(a)).city).toBe('Dayton');
  });

  it("refuses another user's id with 403 and leaves their profile alone", async () => {
    const attacker = await signUp('attacker');
    const victim = await signUp('victim');
    await request(server())
      .patch(`/users/${victim.userId}`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({
        household_id: victim.householdId,
        city: 'Hacked',
        members: [{ first_name: 'Hacked', last_name: 'Hacked', is_head_of_household: 1 }],
      })
      .expect(403);
    const after = await meOf(victim);
    expect(after.city).toBe('Columbus');
    expect(after.members.map((m) => m.first_name)).not.toContain('Hacked');
  });

  it("writes nothing when a user names someone else's household under their own id", async () => {
    const a = await signUp('ownid');
    const other = await signUp('otherhh');
    await request(server())
      .patch(`/users/${a.userId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ household_id: other.householdId, city: 'Hacked' })
      .expect(403);
    // The users row used to be written before the household check refused the request.
    expect((await meOf(a)).city).toBe('Columbus');
    expect((await meOf(other)).city).toBe('Columbus');
  });

  it('keeps lookups by id or code and soft delete away from members of the public', async () => {
    const a = await signUp('nosy');
    const b = await signUp('target');
    const asA = (r: request.Test) => r.set('Authorization', `Bearer ${a.token}`);
    await asA(request(server()).get(`/users/${b.userId}`)).expect(403);
    await asA(
      request(server()).get(
        `/users?identification_code=${encodeURIComponent(b.identificationCode)}`,
      ),
    ).expect(403);
    await asA(request(server()).patch(`/users/${b.userId}/delete`)).expect(403);
    await asA(request(server()).patch(`/users/${b.userId}/restore`)).expect(403);
    // B was not soft-deleted: their own session still works.
    await meOf(b);
  });

  it('still lets staff look a user up by id', async () => {
    const b = await signUp('lookedup');
    const staff = cognitoJwt({ groups: ['staff'] });
    const res = await request(server())
      .get(`/users/${b.userId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .expect(200);
    expect(Number(res.body.id)).toBe(b.userId);
  });
});
