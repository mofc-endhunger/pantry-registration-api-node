import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_questions_library', { database: 'freshtrak_public' })
export class PublicSurveyQuestionLibrary {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'question_id' })
  question_id!: number;

  @Column({ type: 'text', name: 'question_text' })
  question_text!: string;

  @Column({ type: 'varchar', length: 50, name: 'question_type' })
  question_type!: string;
}
