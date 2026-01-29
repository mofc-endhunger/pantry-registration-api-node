import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_triggers')
export class SurveyTrigger {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  assignment_id!: number;

  @Column({ type: 'enum', enum: ['transactional', 'milestone', 'time_cohort'] })
  trigger_type!: 'transactional' | 'milestone' | 'time_cohort';

  @Column({ type: 'int', nullable: true })
  interval_value!: number | null; // e.g., visit count for milestone or days for cohort
}
