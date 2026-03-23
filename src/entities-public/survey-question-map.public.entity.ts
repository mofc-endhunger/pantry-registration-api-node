import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_question_map')
export class PublicSurveyQuestionMap {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'survey_question_id' })
  survey_question_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'survey_id' })
  survey_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'section_id', nullable: true })
  section_id!: number | null;

  @Column({ type: 'int', unsigned: true, name: 'question_id' })
  question_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'display_order', default: () => '0' })
  display_order!: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'is_required', default: () => '0' })
  is_required!: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
