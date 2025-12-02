import { Injectable } from '@nestjs/common';
import type { NotificationEnvelope } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  // Phase 1: define API; implementation (outbox + queue) comes in later tasks
  async enqueue(notification: NotificationEnvelope): Promise<{ id: string }> {
    // Placeholder implementation to keep early imports valid
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return { id };
  }
}


