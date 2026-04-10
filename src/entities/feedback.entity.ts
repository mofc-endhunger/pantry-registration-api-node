import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  registration_id!: number;

  @Column({ type: 'bigint', nullable: true })
  user_id!: number | null;

  @Column({ type: 'int', unsigned: true })
  event_id!: number;

  @Column({ type: 'int', nullable: true })
  questionnaire_version_id!: number | null;

  @Column({ type: 'tinyint', unsigned: true })
  rating!: number; // 1–5

  @Column({ type: 'text', nullable: true })
  comments!: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  submitted_at!: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent!: string | null;

  @Column({ type: 'varbinary', length: 16, nullable: true })
  ip!: Buffer | null;
}
