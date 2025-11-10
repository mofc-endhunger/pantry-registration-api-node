/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);

  constructor() {
    const key = process.env.SENDGRID_API_KEY;
    if (key) {
      try {
        sgMail.setApiKey(key);
      } catch (err) {
        this.logger.warn('Failed to initialize SendGrid', err);
      }
    } else {
      this.logger.log('SendGrid not configured (missing env) — email will be skipped');
    }
  }

  async sendEmail(from: string, to: string, subject: string, html: string) {
    try {
      await sgMail.send({ from, to, subject, html });
      return { success: true };
    } catch (err) {
      this.logger.warn('SendGrid sendEmail error', err);
      return { success: false, error: err };
    }
  }
}
