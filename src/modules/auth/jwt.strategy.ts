import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const useLocal = process.env.USE_LOCAL_JWT === '1';
    if (useLocal) {
      const secret = process.env.JWT_SECRET || 'test-secret';
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
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate(payload: any) {
    const useLocal = process.env.USE_LOCAL_JWT === '1';
    if (!useLocal) {
      const clientId = process.env.COGNITO_CLIENT_ID;
      const tokenUse = payload.token_use;
      // For access tokens, Cognito sets client_id (no aud). For id tokens, use aud.
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
    return { id, userId: id, email, username, cognito: true };
  }
}
