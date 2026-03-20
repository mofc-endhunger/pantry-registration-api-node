import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthGuard } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { Authentication } from '../../entities/authentication.entity';

interface GuardRequest {
  user?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
}

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
        const request = context.switchToHttp().getRequest<GuardRequest>();
        if (request?.user) request.user.authType = 'cognito';
        return true;
      }
    } catch {
      // Ignore and try guest fallback
    }

    // Fallback: guest token in header 'X-Guest-Token'
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const token = request?.headers?.['x-guest-token'] as string | undefined;
    if (!token || typeof token !== 'string') return false;

    const auth = await this.authRepo.findOne({ where: { token } });
    if (!auth) return false;
    if (auth.expires_at && auth.expires_at < new Date()) return false;

    request.user = {
      authType: 'guest',
      dbUserId: auth.user_id,
    };
    return true;
  }
}
