import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_skip_logic')
export class PublicSurveySkipLogic {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'logic_id' })
  logic_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'survey_question_id' })
  survey_question_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'answer_id' })
  answer_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'destination_survey_question_id' })
  destination_survey_question_id!: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
