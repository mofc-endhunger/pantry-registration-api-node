import { User } from '../entities/user.entity';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: User;
}
