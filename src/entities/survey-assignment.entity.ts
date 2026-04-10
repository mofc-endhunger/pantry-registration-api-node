import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_assignments')
export class SurveyAssignment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  survey_id!: number;

  @Column({ type: 'int', unsigned: true })
  hierarchy_type_id!: number;

  @Column({ type: 'int', unsigned: true })
  hierarchy_value!: number;
}
