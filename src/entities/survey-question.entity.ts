import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_questions')
export class SurveyQuestion {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  survey_id!: number;

  @Column({ type: 'varchar', length: 255 })
  prompt!: string;

  @Column({ type: 'enum', enum: ['scale_1_5', 'radio', 'checkbox', 'short_text'] })
  type!: 'scale_1_5' | 'radio' | 'checkbox' | 'short_text';

  @Column({ type: 'tinyint', width: 1, default: () => '1' })
  is_standardized!: boolean;

  @Column({ type: 'int', default: 0 })
  display_order!: number;
}
