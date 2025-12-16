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
    const payload = JSON.stringify(user);
    logger.log(`[createUser] POST ${url}`);
    logger.log(`[createUser] Payload: ${payload}`);
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
      logger.log(`[createUser] Response: status=${response.status}, body=${JSON.stringify(body)}`);
      if (!response.ok) {
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
