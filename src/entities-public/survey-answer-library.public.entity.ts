import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_answer_library')
export class PublicSurveyAnswerLibrary {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'answer_id' })
  answer_id!: number;

  @Column({ type: 'smallint', unsigned: true, name: 'language_id' })
  language_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'question_id' })
  question_id!: number;

  @Column({ type: 'text', name: 'answer_text' })
  answer_text!: string;

  @Column({ type: 'varchar', length: 100, name: 'answer_value', nullable: true })
  answer_value!: string | null;

  @Column({ type: 'int', unsigned: true, name: 'display_order', default: () => '0' })
  display_order!: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
