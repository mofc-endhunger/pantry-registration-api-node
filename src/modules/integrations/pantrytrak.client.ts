import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const logger = new Logger('PantryTrakClient');

@Injectable()
export class PantryTrakClient {
  private readonly baseUrl = process.env.PANTRY_TRAK_API_URL;
  private readonly token = process.env.PANTRY_TRAK_TOKEN;
  private readonly secret = process.env.PANTRY_TRAK_SECRET;
  private readonly enabled = (process.env.PANTRY_TRAK_ENABLED || 'false').toLowerCase() === 'true';

  constructor(private readonly jwtService: JwtService) {
    logger.log(
      `[init] PANTRY_TRAK_ENABLED="${process.env.PANTRY_TRAK_ENABLED}" -> enabled=${this.enabled}`,
    );
    logger.log(`[init] PANTRY_TRAK_API_URL="${this.baseUrl}"`);
  }

  private static toErrorMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) {
      const maybe = e as { message?: unknown };
      if (typeof maybe.message === 'string') return maybe.message;
    }
    return String(e);
  }

  // PII fields that are masked in failure logs. Length and a flag of "interesting"
  // characters (the kinds that trip WAF SQLi/XSS rules) are preserved so we can
  // correlate which field's content is the trigger without leaking the value.
  private static readonly PII_FIELDS = new Set([
    'first_name',
    'middle_name',
    'last_name',
    'phone',
    'address_line_1',
    'address_line_2',
    'date_of_birth',
    'license_plate',
  ]);

  private static describeWafShape(value: string): string {
    const flags: string[] = [];
    if (/['"`]/.test(value)) flags.push('quote');
    if (/[<>]/.test(value)) flags.push('angle');
    if (/--|\/\*|\*\//.test(value)) flags.push('sqlcomment');
    if (/[;()]/.test(value)) flags.push('punct');
    if (/\\/.test(value)) flags.push('bslash');
    if (/\b(select|union|drop|insert|update|delete|script|onerror|onload)\b/i.test(value))
      flags.push('keyword');
    if (/[^\x20-\x7e]/.test(value)) flags.push('nonascii');
    return `len=${value.length}${flags.length ? ' flags=' + flags.join(',') : ''}`;
  }

  private static redactForLog(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) {
        out[k] = v;
        continue;
      }
      if (k === 'email' && typeof v === 'string') {
        const at = v.lastIndexOf('@');
        const domain = at >= 0 ? v.slice(at + 1) : '';
        out[k] = `<redacted ${PantryTrakClient.describeWafShape(v)}${domain ? ' domain=' + domain : ''}>`;
        continue;
      }
      if (PantryTrakClient.PII_FIELDS.has(k) && typeof v === 'string') {
        out[k] = `<redacted ${PantryTrakClient.describeWafShape(v)}>`;
        continue;
      }
      out[k] = v;
    }
    return out;
  }

  private makeBearer(): string {
    if (!this.token || !this.secret)
      throw new Error('PANTRY_TRAK_TOKEN or PANTRY_TRAK_SECRET not configured');
    const payload = { token: this.token, time: Math.floor(Date.now() / 1000) };
    const signed = this.jwtService.sign(payload, { secret: this.secret, algorithm: 'HS256' });
    return `Bearer ${signed}`;
  }

  private urlFor(path: string): string {
    if (!this.baseUrl) throw new Error('PANTRY_TRAK_API_URL not configured');
    return `${this.baseUrl.replace(/\/+$/, '')}/${path}`;
  }

  async createUser(
    user: unknown,
  ): Promise<{ success: boolean; status?: number; body?: unknown; error?: string }> {
    if (!this.enabled) {
      logger.log('[createUser] PantryTrak disabled, skipping');
      return { success: false, error: 'disabled' };
    }
    const url = this.urlFor('api/create_freshtrak_user.php');
    // Build the payload sent to PantryTrak.
    // Strip cognito_uuid — it is a raw 16-byte Buffer that JSON.stringify renders as
    // {"type":"Buffer","data":[...]} which PT cannot parse, causing a 403.
    // PT's endpoint is a simple INSERT ON DUPLICATE KEY UPDATE and accepts all user_type
    // values (guest, customer, registered), so the local user_type is sent as-is.
    // All string columns in the PT users table are nullable, so null values are fine.
    const sanitized: Record<string, unknown> =
      user && typeof user === 'object'
        ? Object.fromEntries(
            Object.entries(user as Record<string, unknown>).filter(([k]) => k !== 'cognito_uuid'),
          )
        : {};
    const payload = JSON.stringify(sanitized);
    const userId =
      user && typeof user === 'object' && 'id' in user
        ? String((user as Record<string, unknown>).id)
        : 'unknown';
    logger.log(`[createUser] POST ${url} userId=${userId}`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.makeBearer(),
          'Content-Type': 'application/json',
        },
        body: payload,
      });
      const body: unknown = await response.json().catch(() => null);
      logger.log(`[createUser] Response: status=${response.status}, success=${response.ok}`);
      if (!response.ok) {
        // Log response headers on failure — helps distinguish an Apache/WAF 403
        // (Content-Type: text/html, X-*-ModSecurity headers) from a PHP-level response.
        const headerDump: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headerDump[key] = value;
        });
        // AWS-issued 403s come back with x-amzn-trace-id / x-amz-request-id;
        // capture them so PT ops can correlate to a specific WAF/ALB log entry.
        const traceId =
          response.headers.get('x-amzn-trace-id') || response.headers.get('x-amz-request-id') || '';
        // Redact PII before logging the outgoing payload, but preserve length +
        // shape flags per field so we can spot which field's content is matching
        // a WAF rule when comparing a working vs. failing call.
        const redacted = PantryTrakClient.redactForLog(sanitized);
        logger.warn(
          `[createUser] Failed (HTTP ${response.status}) userId=${userId} traceId=${traceId} payloadBytes=${payload.length} payload=${JSON.stringify(redacted)} headers=${JSON.stringify(headerDump)} body=${JSON.stringify(body)}`,
        );
        return { success: false, status: response.status, body, error: `HTTP ${response.status}` };
      }
      return { success: true, status: response.status, body };
    } catch (err: unknown) {
      const message = PantryTrakClient.toErrorMessage(err);
      logger.error(`[createUser] Error: ${message}`);
      return { success: false, error: message };
    }
  }

  async createReservation(payload: {
    id: number;
    user_id: number;
    event_date_id: number;
    event_slot_id?: number | null;
  }): Promise<{ success: boolean; status?: number; body?: unknown; error?: string }> {
    if (!this.enabled) {
      logger.log('[createReservation] PantryTrak disabled, skipping');
      return { success: false, error: 'disabled' };
    }
    const url = this.urlFor('api/create_freshtrak_reservation.php');
    const payloadStr = JSON.stringify(payload);
    logger.log(`[createReservation] POST ${url}`);
    logger.log(`[createReservation] Payload: ${payloadStr}`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.makeBearer(),
          'Content-Type': 'application/json',
        },
        body: payloadStr,
      });
      const body: unknown = await response.json().catch(() => null);
      logger.log(
        `[createReservation] Response: status=${response.status}, body=${JSON.stringify(body)}`,
      );
      if (!response.ok) {
        return { success: false, status: response.status, body, error: `HTTP ${response.status}` };
      }
      return { success: true, status: response.status, body };
    } catch (err: unknown) {
      const message = PantryTrakClient.toErrorMessage(err);
      logger.error(`[createReservation] Error: ${message}`);
      return { success: false, error: message };
    }
  }
}

export default PantryTrakClient;
