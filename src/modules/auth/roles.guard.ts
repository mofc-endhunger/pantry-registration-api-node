import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as any;
    // Expect roles in token: payload['cognito:groups'] or payload.roles
    const groups: string[] = (user && (user['cognito:groups'] as string[])) || user?.roles || [];
    const has = requiredRoles.some((r) => groups?.includes(r));
    if (!has) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
