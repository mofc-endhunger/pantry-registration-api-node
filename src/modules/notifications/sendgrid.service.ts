import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

interface EmailResult {
  success: boolean;
  error?: unknown;
}

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private enabled = true;

  constructor() {
    // Respect runtime guard to quickly disable email sending in non-prod
    this.enabled = process.env.SENDGRID_ENABLED !== 'false';
    if (!this.enabled) {
      this.logger.log('SendGrid disabled via SENDGRID_ENABLED — email will be skipped');
      return;
    }

    const key = process.env.SENDGRID_API_KEY;
    if (key) {
      try {
        sgMail.setApiKey(key);
      } catch (err: unknown) {
        this.logger.warn('Failed to initialize SendGrid', err as Error);
      }
    } else {
      this.logger.log('SendGrid not configured (missing env) — email will be skipped');
    }
  }

  async sendEmail(from: string, to: string, subject: string, html: string): Promise<EmailResult> {
    if (!this.enabled) {
      this.logger.warn('SendGrid disabled at runtime — skipping email');
      return { success: false, error: 'disabled' };
    }
    try {
      await sgMail.send({ from, to, subject, html });
      return { success: true };
    } catch (err: unknown) {
      this.logger.warn('SendGrid sendEmail error', err as Error);
      return { success: false, error: err };
    }
  }
}
