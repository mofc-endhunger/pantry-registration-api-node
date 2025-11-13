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
  private enabled = true;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    // Respect runtime guard to quickly disable SMS in non-prod
    this.enabled = process.env.TWILIO_ENABLED !== 'false';
    if (!this.enabled) {
      this.logger.log('Twilio disabled via TWILIO_ENABLED — SMS will be skipped');
      return;
    }

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
    if (!this.enabled) {
      this.logger.warn('Twilio disabled at runtime — skipping SMS');
      return { success: false, reason: 'disabled' };
    }

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
