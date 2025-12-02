import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notification_template')
export class NotificationTemplate {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 16 })
  channel!: 'email' | 'sms' | 'push' | 'webhook';

  @Index()
  @Column({ type: 'varchar', length: 64 })
  language!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  template_id!: string;

  @Column({ type: 'text', nullable: true, default: null })
  subject_template?: string | null;

  @Column({ type: 'longtext' })
  body_template!: string;

  @Column({ type: 'varchar', length: 32, default: 'handlebars' })
  engine!: 'handlebars' | 'nunjucks' | 'mjml';

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}


