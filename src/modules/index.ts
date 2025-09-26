import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuthCallbacksModule } from './auth-callbacks/auth-callbacks.module';
import { GuestAuthenticationsModule } from './guest-authentications/guest-authentications.module';
import { HouseholdsModule } from './households/households.module';

export const FeatureModules = [
  HealthModule,
  AuthModule,
  UsersModule,
  AuthCallbacksModule,
  GuestAuthenticationsModule,
  HouseholdsModule,
];
