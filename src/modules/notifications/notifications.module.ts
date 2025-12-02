import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationOutbox } from '../../entities/notification-outbox.entity';
import { DispatcherService } from './services/dispatcher.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationOutbox])],
  providers: [NotificationService, DispatcherService],
  exports: [NotificationService, DispatcherService],
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
