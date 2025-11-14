import { Injectable, Logger } from '@nestjs/common';

export interface PantryTrakJobPayload {
  type: 'createUser' | 'createReservation';
  data: unknown;
}

@Injectable()
export class PantryTrakService {
  private readonly logger = new Logger('PantryTrakService');
  // Queue support was intentionally removed from this build (bullmq not installed).
  // This service remains as a no-op shim so the rest of the codebase can import it
  // without pulling in the optional worker dependency.
  // If you want queue-based retries, add bullmq and restore the worker.
  private readonly enabled: boolean;

  constructor() {
    this.enabled = (process.env.PANTRY_TRAK_ENABLED || 'false').toLowerCase() === 'true';
    if (!this.enabled) {
      this.logger.log('PantryTrak integration disabled via PANTRY_TRAK_ENABLED');
    } else {
      this.logger.log(
        'PantryTrak enabled, but queue worker support is not available in this build',
      );
    }
  }

  enqueueCreateUser(_user: unknown): Promise<{ enqueued: boolean; reason: string }> {
    if (!this.enabled) {
      this.logger.debug('enqueueCreateUser skipped: disabled');
      return Promise.resolve({ enqueued: false, reason: 'disabled' });
    }
    this.logger.warn('enqueueCreateUser called but queue worker is not available');
    return Promise.resolve({ enqueued: false, reason: 'not-implemented' });
  }

  enqueueCreateReservation(_payload: {
    id: number;
    user_id: number;
    event_date_id: number;
    event_slot_id?: number | null;
  }): Promise<{ enqueued: boolean; reason: string }> {
    if (!this.enabled) {
      this.logger.debug('enqueueCreateReservation skipped: disabled');
      return Promise.resolve({ enqueued: false, reason: 'disabled' });
    }
    this.logger.warn('enqueueCreateReservation called but queue worker is not available');
    return Promise.resolve({ enqueued: false, reason: 'not-implemented' });
  }
}

export default PantryTrakService;
