import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('questionnaire_versions')
export class QuestionnaireVersion {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'tinyint', width: 1, default: () => '1' })
  is_active!: boolean;

  @Column({ type: 'date' })
  effective_from!: string;

  @Column({ type: 'date', nullable: true })
  effective_to!: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
