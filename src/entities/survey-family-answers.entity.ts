import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_family_answers')
export class SurveyFamilyAnswer {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, name: 'survey_family_answer_id' })
  survey_family_answer_id!: number;

  @Column({ type: 'bigint', unsigned: true, name: 'survey_family_id' })
  survey_family_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'survey_question_id' })
  survey_question_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'answer_id', nullable: true })
  answer_id!: number | null;

  @Column({ type: 'varchar', length: 255, name: 'answer_value', nullable: true })
  answer_value!: string | null;

  @Column({ type: 'text', name: 'answer_text', nullable: true })
  answer_text!: string | null;

  @Column({ type: 'datetime', name: 'answered_at', default: () => 'CURRENT_TIMESTAMP' })
  answered_at!: Date;
}
