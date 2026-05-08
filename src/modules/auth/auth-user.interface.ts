export interface AuthUser {
  authType?: string;
  dbUserId?: number;
  userId?: string;
  id?: string;
  email?: string;
  username?: string;
  roles?: string[];
  cognito?: boolean;
}
