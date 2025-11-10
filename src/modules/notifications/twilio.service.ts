import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

type TwilioClient = ReturnType<typeof Twilio>;

interface SmsResult {
  success: boolean;
  sid?: string;
  reason?: string;
  error?: unknown;
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client?: TwilioClient;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      try {
        // initialize client
        const twilio = Twilio(sid, token);
        this.client = twilio;
      } catch (err: unknown) {
        this.logger.warn('Failed to initialize Twilio client', err as Error);
      }
    } else {
      this.logger.log('Twilio not configured (missing env) — SMS will be skipped');
    }
  }

  async sendSms(from: string | undefined, to: string, body: string): Promise<SmsResult> {
    if (!this.client) {
      this.logger.warn('Twilio client not available — skipping SMS');
      return { success: false, reason: 'not-configured' };
    }

    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;
    try {
      const msg = await this.client.messages.create({ from: fromNumber, to, body });
      return { success: true, sid: (msg as { sid?: string }).sid };
    } catch (err: unknown) {
      this.logger.warn('Twilio sendSms error', err as Error);
      return { success: false, error: err };
    }
  }
}
