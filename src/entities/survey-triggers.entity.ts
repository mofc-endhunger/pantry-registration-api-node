import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_triggers')
export class SurveyTrigger {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  assignment_id!: number;

  @Column({ type: 'enum', enum: ['transaction', 'enrollment', 'interval'] })
  trigger_type!: 'transaction' | 'enrollment' | 'interval';

  @Column({ type: 'enum', enum: ['visit_count', 'days_since_start', 'hybrid'], nullable: true })
  interval_metric!: 'visit_count' | 'days_since_start' | 'hybrid' | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  interval_value!: number | null;

  @Column({ type: 'tinyint', width: 1, default: () => '0' })
  is_recurring!: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date_added!: Date;

  @Column({ type: 'tinyint', unsigned: true, default: () => '1' })
  status_id!: number;
}
