import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}

import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { SendgridService } from './sendgrid.service';
import { TwilioController } from './twilio.controller';

@Module({
  imports: [],
  providers: [TwilioService, SendgridService],
  controllers: [TwilioController],
  exports: [TwilioService, SendgridService],
})
export class NotificationsModule {}
