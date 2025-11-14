import axios, { AxiosResponse } from 'axios';
import jwt from 'jsonwebtoken';
import { Injectable, Logger } from '@nestjs/common';

const logger = new Logger('PantryTrakClient');

@Injectable()
export class PantryTrakClient {
  private readonly baseUrl = process.env.PANTRY_TRAK_API_URL;
  private readonly token = process.env.PANTRY_TRAK_TOKEN;
  private readonly secret = process.env.PANTRY_TRAK_SECRET;
  private readonly enabled = (process.env.PANTRY_TRAK_ENABLED || 'false').toLowerCase() === 'true';

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
    return `Bearer ${jwt.sign(payload, this.secret, { algorithm: 'HS256' })}`;
  }

  private urlFor(path: string): string {
    if (!this.baseUrl) throw new Error('PANTRY_TRAK_API_URL not configured');
    return `${this.baseUrl.replace(/\/+$/, '')}/${path}`;
  }

  async createUser(
    user: unknown,
  ): Promise<{ success: boolean; status?: number; body?: unknown; error?: string }> {
    if (!this.enabled) return { success: false, error: 'disabled' };
    try {
      const url = this.urlFor('api/create_freshtrak_user.php');
      const headers = { Authorization: this.makeBearer(), 'Content-Type': 'application/json' };
      const r: AxiosResponse<unknown> = await axios.post<unknown>(url, user, { headers });
      return { success: true, status: r.status, body: r.data };
    } catch (err: unknown) {
      const message = PantryTrakClient.toErrorMessage(err);
      logger.warn(`createUser error: ${message}`);
      return { success: false, error: message };
    }
  }

  async createReservation(payload: {
    id: number;
    user_id: number;
    event_date_id: number;
    event_slot_id?: number | null;
  }): Promise<{ success: boolean; status?: number; body?: unknown; error?: string }> {
    if (!this.enabled) return { success: false, error: 'disabled' };
    try {
      const url = this.urlFor('api/create_freshtrak_reservation.php');
      const headers = { Authorization: this.makeBearer(), 'Content-Type': 'application/json' };
      const r: AxiosResponse<unknown> = await axios.post<unknown>(url, payload, { headers });
      return { success: true, status: r.status, body: r.data };
    } catch (err: unknown) {
      const message = PantryTrakClient.toErrorMessage(err);
      logger.warn(`createReservation error: ${message}`);
      return { success: false, error: message };
    }
  }
}

export default PantryTrakClient;
