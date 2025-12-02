import { Injectable } from '@nestjs/common';
import type { NotificationEnvelope, SendResult } from '../dto/notification.dto';

@Injectable()
export class DispatcherService {
  // Phase 1: no real routing; placeholder for future provider selection and sending
  async dispatch(_notification: NotificationEnvelope): Promise<SendResult> {
    return { success: true };
  }
}


