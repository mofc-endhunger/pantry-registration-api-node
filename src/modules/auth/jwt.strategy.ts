import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';
import type { AuthUser } from './auth-user.interface';

interface CognitoJwtPayload {
  sub: string;
  email?: string;
  username?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  token_use?: string;
  client_id?: string;
  aud?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const useLocal = process.env.USE_LOCAL_JWT === '1';
    if (useLocal) {
      const secret = process.env.JWT_SECRET || 'test-secret';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: secret,
        algorithms: ['HS256'],
      } as unknown as any);
    } else {
      const region = process.env.COGNITO_REGION;
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      const jwksUri = `${issuer}/.well-known/jwks.json`;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        secretOrKeyProvider: jwksRsa.passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
          jwksUri,
        }) as unknown as any,
        issuer,
        algorithms: ['RS256'],
      } as unknown as any);
    }
  }

  validate(payload: CognitoJwtPayload): AuthUser {
    const useLocal = process.env.USE_LOCAL_JWT === '1';
    if (!useLocal) {
      const clientId = process.env.COGNITO_CLIENT_ID;
      const tokenUse = payload.token_use;
      if (tokenUse === 'access') {
        if (payload.client_id !== clientId) {
          throw new UnauthorizedException('Invalid client for access token');
        }
      } else if (tokenUse === 'id') {
        if (payload.aud !== clientId) {
          throw new UnauthorizedException('Invalid audience for id token');
        }
      }
    }
    const id = payload.sub;
    const email = payload.email;
    const username = payload['cognito:username'] ?? payload.username;
    const roles: string[] = payload['cognito:groups'] ?? [];
    return { id, userId: id, email, username, cognito: true, roles };
  }
}
