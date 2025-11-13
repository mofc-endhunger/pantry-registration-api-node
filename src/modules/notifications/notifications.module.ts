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
