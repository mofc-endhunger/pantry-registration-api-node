import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'bigint', unsigned: true })
  submission_id!: number;

  @Column({ type: 'int', unsigned: true })
  question_id!: number;

  @Column({ type: 'text' })
  answer_value!: string;
}
