/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client?: Twilio.Twilio;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      try {
        // initialize client
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = Twilio(sid, token) as any;
        this.client = twilio;
      } catch (err) {
        this.logger.warn('Failed to initialize Twilio client', err);
      }
    } else {
      this.logger.log('Twilio not configured (missing env) — SMS will be skipped');
    }
  }

  async sendSms(from: string | undefined, to: string, body: string) {
    if (!this.client) {
      this.logger.warn('Twilio client not available — skipping SMS');
      return { success: false, reason: 'not-configured' };
    }

    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;
    try {
      const msg = await this.client.messages.create({ from: fromNumber, to, body });
      return { success: true, sid: msg.sid };
    } catch (err) {
      this.logger.warn('Twilio sendSms error', err);
      return { success: false, error: err };
    }
  }
}
