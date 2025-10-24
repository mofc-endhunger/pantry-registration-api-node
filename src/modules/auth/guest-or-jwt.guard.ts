import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthGuard } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { Authentication } from '../../entities/authentication.entity';

// Tries Cognito JWT first via passport 'jwt'; if that fails, falls back to DB-backed guest token
@Injectable()
export class GuestOrJwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try JWT first
    try {
      const can = (await super.canActivate(context)) as boolean;
      if (can) {
        // Attach a hint that this is a cognito-authenticated user
        const request = context.switchToHttp().getRequest();
        if (request?.user) request.user.authType = 'cognito';
        return true;
      }
    } catch (_) {
      // Ignore and try guest fallback
    }

    // Fallback: guest token in header 'X-Guest-Token'
    const request = context.switchToHttp().getRequest();
    const token: string | undefined = request?.headers?.['x-guest-token'] as string;
    if (!token || typeof token !== 'string') return false;

    const auth = await this.authRepo.findOne({ where: { token } });
    if (!auth) return false;
    if (auth.expires_at && auth.expires_at < new Date()) return false;

    // Attach minimal user context expected by services
    request.user = {
      authType: 'guest',
      dbUserId: auth.user_id,
    };
    return true;
  }
}
