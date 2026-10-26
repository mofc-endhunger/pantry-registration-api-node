import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { SendgridService } from './sendgrid.service';

// No controller: sends are triggered server-side only. The former public
// POST /twilio/sms and /twilio/email endpoints had no auth and accepted an
// arbitrary sender, recipient and body, so they worked as open relays.
@Module({
  imports: [],
  providers: [TwilioService, SendgridService],
  exports: [TwilioService, SendgridService],
})
export class NotificationsModule {}
