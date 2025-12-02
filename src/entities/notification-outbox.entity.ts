import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'dead';
type Channel = 'email' | 'sms' | 'push' | 'webhook';
type Priority = 'low' | 'normal' | 'high';

@Entity('notification_outbox')
export class NotificationOutbox {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'datetime', nullable: true, default: null })
  next_run_at?: Date | null;

  @Column({ type: 'varchar', length: 16 })
  channel!: Channel;

  @Column({ type: 'json' })
  to!: unknown;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  subject_or_title?: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  body?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true, default: null })
  template_id?: string | null;

  @Column({ type: 'json', nullable: true, default: null })
  variables?: unknown;

  @Column({ type: 'json', nullable: true, default: null })
  metadata?: unknown;

  @Column({ type: 'varchar', length: 10, default: 'normal' })
  priority!: Priority;

  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  provider?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  error_code?: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  error_message?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  correlation_id?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  tenant_id?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}


