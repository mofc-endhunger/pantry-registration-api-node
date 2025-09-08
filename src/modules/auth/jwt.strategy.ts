import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
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
    if (!payload.sub) {
      console.log('JwtStrategy.validate: payload.sub is missing');
      return null;
    }
    // Default: return user info
    return { id: payload.sub, email: payload.email };
  }
}
