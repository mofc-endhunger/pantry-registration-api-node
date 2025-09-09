import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import * as dns from 'dns';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private cognitoIssuer = `https://cognito-idp-${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
  private jwksUri = `${this.cognitoIssuer}/.well-known/jwks.json`;
  private jwks = jwksClient({ jwksUri: this.jwksUri });

  // ...existing code...
  // ...existing code...

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
  secretOrKeyProvider: async (request: any, rawJwtToken: any, done: any) => {
        try {
          const decoded: any = jwt.decode(rawJwtToken, { complete: true });
          if (decoded && decoded.payload && decoded.payload.iss && decoded.payload.iss.startsWith('https://cognito-idp')) {
            // Cognito token: get signing key from JWKs
            const kid = decoded.header.kid;
            this.jwks.getSigningKey(kid, (err: any, key: any) => {
              if (err) return done(err);
              if (!key) return done(new Error('No signing key found'));
              const signingKey = key.getPublicKey();
              return done(null, signingKey);
            });
          } else {
            // Local JWT (guest)
            return done(null, jwtConstants.secret);
          }
        } catch (err) {
          return done(err);
        }
      },
    });
  }

  async validate(payload: any) {
    // Log for debugging
    console.log('JwtStrategy.validate called with payload:', payload);
    if (!payload) {
      console.log('JwtStrategy.validate: payload is undefined or null');
      return null;
    }
    if (payload.role === 'guest') {
      // Allow guest JWTs
      return { id: payload.sub, role: 'guest' };
    }
    if (payload.iss && payload.iss.startsWith('https://cognito-idp')) {
      // Cognito user
      return { id: payload.sub, email: payload.email, username: payload.username, cognito: true };
    }
    if (!payload.sub) {
      console.log('JwtStrategy.validate: payload.sub is missing');
      return null;
    }
    // Default: return user info
    return { id: payload.sub, email: payload.email };
  }
}
