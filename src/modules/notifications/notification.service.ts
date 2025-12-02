import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NotificationEnvelope } from './dto/notification.dto';
import { NotificationOutbox } from '../../entities/notification-outbox.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outboxRepo: Repository<NotificationOutbox>,
  ) {}

  // Phase 1: persist to outbox; processing will be added by worker
  async enqueue(notification: NotificationEnvelope): Promise<{ id: number }> {
    const toArray = Array.isArray(notification.to) ? notification.to : [notification.to];
    const row = this.outboxRepo.create({
      status: 'pending',
      attempts: 0,
      next_run_at: null,
      channel: notification.channel,
      to: toArray,
      subject_or_title: notification.subjectOrTitle ?? null,
      body: notification.body ?? null,
      template_id: notification.templateId ?? null,
      variables: notification.variables ?? null,
      metadata: notification.metadata ?? null,
      priority: notification.priority ?? 'normal',
      provider: null,
      error_code: null,
      error_message: null,
      correlation_id: notification.correlationId ?? null,
      tenant_id: notification.tenantId ?? null,
    } as NotificationOutbox);
    const saved = await this.outboxRepo.save(row);
    return { id: saved.id };
  }
}


