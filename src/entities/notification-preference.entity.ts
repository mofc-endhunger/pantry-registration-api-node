import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notification_preference')
export class NotificationPreference {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  user_id!: number;

  @Column({ type: 'varchar', length: 16 })
  channel!: 'email' | 'sms' | 'push' | 'webhook';

  @Column({ type: 'tinyint', width: 1, default: 1 })
  allowed!: boolean;

  @Column({ type: 'json', nullable: true, default: null })
  quiet_hours?: unknown;

  @Column({ type: 'int', nullable: true, default: null })
  rate_limit_per_hour?: number | null;

  @Column({ type: 'datetime', nullable: true, default: null })
  last_sent_at?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}


