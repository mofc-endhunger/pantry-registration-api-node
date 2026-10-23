/**
 * SendGrid dynamic template for the reservation confirmation email.
 * Overridable per environment via SENDGRID_RESERVATION_TEMPLATE_ID.
 */
export const DEFAULT_RESERVATION_TEMPLATE_ID = 'd-4cd439ae9d574a6ca65ec22c290cfce7';

/**
 * Suffix of the placeholder address persisted for a Cognito user whose token
 * carried no email claim (see RegistrationsService.resolveEmail). It is not a
 * deliverable mailbox and must never be emailed.
 */
export const PLACEHOLDER_EMAIL_SUFFIX = '@auto.local';
