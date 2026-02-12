import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_question_map', { database: 'freshtrak_public' })
export class PublicSurveyQuestionMap {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'survey_question_id' })
  survey_question_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'survey_id' })
  survey_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'question_id' })
  question_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'display_order', default: () => '0' })
  display_order!: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'is_required', default: () => '0' })
  is_required!: number;
}
