import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_questions_library')
export class PublicSurveyQuestionLibrary {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'question_id' })
  question_id!: number;

  @Column({ type: 'smallint', unsigned: true, name: 'language_id' })
  language_id!: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'answer_type_id', nullable: true })
  answer_type_id!: number | null;

  @Column({ type: 'text', name: 'question_text' })
  question_text!: string;

  @Column({ type: 'varchar', length: 50, name: 'question_type' })
  question_type!: string;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
