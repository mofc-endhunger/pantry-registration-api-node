import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

type AuditStatus = 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';

@Entity('notification_audit')
export class NotificationAudit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Index()
  @Column({ type: 'bigint', unsigned: true, nullable: true, default: null })
  notification_id?: number | null;

  @Column({ type: 'varchar', length: 64 })
  provider!: string;

  @Column({ type: 'varchar', length: 128, nullable: true, default: null })
  provider_message_id?: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: AuditStatus;

  @Column({ type: 'json', nullable: true, default: null })
  payload?: unknown;

  @CreateDateColumn({ type: 'datetime' })
  occurred_at!: Date;
}


