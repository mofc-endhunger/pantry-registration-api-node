import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { SendgridService } from './sendgrid.service';

@Controller('twilio')
export class TwilioController {
  constructor(private readonly twilio: TwilioService, private readonly sendgrid: SendgridService) {}

  @Post('sms')
  async sms(@Body() body: { from_phone_number?: string; to_phone_number: string; message: string }) {
    const res = await this.twilio.sendSms(body.from_phone_number, body.to_phone_number, body.message);
    if (res && res.success) {
      return { sms_sent: true };
    }
    throw new HttpException({}, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Post('email')
  async email(@Body() body: { from: string; subject: string; to: string; content: string }) {
    const res = await this.sendgrid.sendEmail(body.from, body.to, body.subject, body.content);
    if (res && res.success) {
      return { email_delivered: true };
    }
    throw new HttpException({}, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
