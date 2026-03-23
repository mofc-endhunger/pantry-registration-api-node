import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('form_submissions')
export class FormSubmission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'int' })
  form_id!: number;

  @Column({ type: 'int' })
  trigger_id!: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  registration_id!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  user_id!: number | null;

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  overall_rating!: number | null; // 1–5

  @Column({ type: 'text', nullable: true })
  comments!: string | null;

  @Column({ type: 'int', unsigned: true })
  date_key!: number; // YYYYMMDD

  @Column({ type: 'int', unsigned: true })
  time_key!: number; // minutes since midnight

  @Column({ type: 'varbinary', length: 16, nullable: true })
  ip_address!: Buffer | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date_added!: Date;

  @Column({ type: 'tinyint', unsigned: true, default: () => '17' })
  status_id!: number; // 17 = served/completed
}
