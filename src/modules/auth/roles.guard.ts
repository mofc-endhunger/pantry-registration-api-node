import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

interface RolesRequest {
  user?: {
    'cognito:groups'?: string[];
    roles?: string[];
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<RolesRequest>();
    const user = request.user;
    const groups: string[] = user?.['cognito:groups'] || user?.roles || [];
    const has = requiredRoles.some((r) => groups?.includes(r));
    if (!has) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
