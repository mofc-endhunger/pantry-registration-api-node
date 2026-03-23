import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('questionnaire_questions')
export class QuestionnaireQuestion {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  questionnaire_version_id!: number;

  @Column({ type: 'int' })
  display_order!: number;

  @Column({ type: 'enum', enum: ['scale_1_5'] })
  type!: 'scale_1_5';

  @Column({ type: 'varchar', length: 255 })
  prompt!: string;

  @Column({ type: 'tinyint', width: 1, default: () => '1' })
  required!: boolean;

  @Column({ type: 'tinyint', unsigned: true, default: () => '1' })
  min_value!: number;

  @Column({ type: 'tinyint', unsigned: true, default: () => '5' })
  max_value!: number;
}
