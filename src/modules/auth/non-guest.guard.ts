import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class NonGuestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (user && user.role === 'guest') {
      throw new ForbiddenException('Guest access is not allowed for this resource');
    }
    return true;
  }
}

