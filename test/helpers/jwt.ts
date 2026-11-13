import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Mint a Cognito-shaped JWT for e2e, signed with the local HS256 secret (USE_LOCAL_JWT=1).
 *
 * The registrations service resolves the DB user from `sub` as a Cognito UUID
 * (`users.cognito_uuid`). Tokens from the legacy `POST /auth/login` carry the numeric
 * DB user id as `sub`, which never resolves, so every request would provision a new
 * user and household. Use this helper for any spec that acts as a signed-in user.
 */
export function cognitoJwt(opts: { email?: string; sub?: string } = {}): {
  token: string;
  sub: string;
  email: string;
} {
  const sub = opts.sub ?? randomUUID();
  const email = opts.email ?? `e2e+${sub.slice(0, 8)}@example.com`;
  const secret = process.env.JWT_SECRET || 'test-secret';
  const token = jwt.sign({ sub, email, username: email.split('@')[0] }, secret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
  return { token, sub, email };
}
