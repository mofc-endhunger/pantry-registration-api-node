import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

interface EmailResult {
  success: boolean;
  error?: unknown;
}

/** Sender used when a caller does not supply one. Must be a SendGrid-verified sender. */
export const DEFAULT_FROM_EMAIL = 'no-reply@freshtrak.com';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private enabled = true;
  private configured = false;

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
        this.configured = true;
      } catch (err: unknown) {
        this.logger.warn(`Failed to initialize SendGrid: ${SendgridService.describeError(err)}`);
      }
    } else {
      this.logger.log('SendGrid not configured (missing env) — email will be skipped');
    }
  }

  /**
   * Send using a SendGrid dynamic template (`d-` id). The template owns the
   * subject and body, so no `subject`/`html` is sent — SendGrid would override
   * them anyway.
   */
  async sendTemplate(
    to: string,
    templateId: string,
    dynamicTemplateData: Record<string, unknown>,
    from: string = process.env.SENDGRID_FROM_EMAIL || DEFAULT_FROM_EMAIL,
  ): Promise<EmailResult> {
    const skipped = this.skipReason();
    if (skipped) return skipped;
    try {
      await sgMail.send({ from, to, templateId, dynamicTemplateData });
      return { success: true };
    } catch (err: unknown) {
      this.logger.warn(
        `SendGrid sendTemplate error (template=${templateId}): ${SendgridService.describeError(err)}`,
      );
      return { success: false, error: err };
    }
  }

  private skipReason(): EmailResult | null {
    if (!this.enabled) {
      this.logger.warn('SendGrid disabled at runtime — skipping email');
      return { success: false, error: 'disabled' };
    }
    if (!this.configured) {
      this.logger.warn('SendGrid API key not configured — skipping email');
      return { success: false, error: 'not_configured' };
    }
    return null;
  }

  /**
   * SendGrid puts the actionable reason (e.g. an unverified sender) in
   * `response.body.errors[].message`; the error's own message is just the
   * HTTP status text.
   */
  private static describeError(err: unknown): string {
    const body = (err as { response?: { body?: { errors?: Array<{ message?: string }> } } })
      ?.response?.body;
    const details = body?.errors
      ?.map((e) => e.message)
      .filter((m): m is string => typeof m === 'string');
    if (details && details.length) return details.join('; ');
    return err instanceof Error ? err.message : String(err);
  }
}
