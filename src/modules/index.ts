import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuthCallbacksModule } from './auth-callbacks/auth-callbacks.module';
import { GuestAuthenticationsModule } from './guest-authentications/guest-authentications.module';
import { HouseholdsModule } from './households/households.module';
import { EventsModule } from './events/events.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { ReservationsModule } from './reservations/reservations.module';
import { FeedbackModule } from './feedback/feedback.module';
import { SurveysModule } from './surveys/surveys.module';

export const FeatureModules = [
  HealthModule,
  AuthModule,
  UsersModule,
  AuthCallbacksModule,
  GuestAuthenticationsModule,
  HouseholdsModule,
  EventsModule,
  RegistrationsModule,
  ReservationsModule,
  FeedbackModule,
  SurveysModule,
];
