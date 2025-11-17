import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { SendgridService } from './sendgrid.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('twilio')
export class TwilioController {
  constructor(
    private readonly twilio: TwilioService,
    private readonly sendgrid: SendgridService,
  ) {}

  private static extractReason(fallback: string, res: unknown): string {
    if (res && typeof res === 'object') {
      const resultObj = res as { reason?: unknown; error?: unknown };
      if (typeof resultObj.reason === 'string') {
        return resultObj.reason;
      }
      const err = resultObj.error;
      if (err && typeof err === 'object') {
        const message = (err as Record<string, unknown>).message;
        if (typeof message === 'string') {
          return message;
        }
      }
      if (typeof err === 'string' || typeof err === 'number' || typeof err === 'boolean') {
        return String(err);
      }
    }
    return fallback;
  }

  @Post('sms')
  async sms(@Body() body: SendSmsDto) {
    const res: Awaited<ReturnType<TwilioService['sendSms']>> = await this.twilio.sendSms(
      body.from_phone_number,
      body.to_phone_number,
      body.message,
    );
    if (res && res.success) {
      return { sms_sent: true };
    }
    const reason = TwilioController.extractReason('sms_failed', res);
    throw new HttpException({ sms_sent: false, reason }, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Post('email')
  async email(@Body() body: SendEmailDto) {
    const res: Awaited<ReturnType<SendgridService['sendEmail']>> = await this.sendgrid.sendEmail(
      body.from,
      body.to,
      body.subject,
      body.content,
    );
    if (res && res.success) {
      return { email_delivered: true };
    }
    const reason = TwilioController.extractReason('email_failed', res);
    throw new HttpException({ email_delivered: false, reason }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
