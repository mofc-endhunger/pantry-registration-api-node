import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('survey_families')
export class SurveyFamily {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, name: 'survey_family_id' })
  survey_family_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'survey_id' })
  survey_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'family_id', nullable: true })
  family_id!: number | null;

  @Column({ type: 'int', unsigned: true, name: 'family_member_id', nullable: true })
  family_member_id!: number | null;

  @Column({ type: 'tinyint', unsigned: true, name: 'linkage_type_id', default: () => '0' })
  linkage_type_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'linkage_type_NK', default: () => '0' })
  linkage_type_NK!: number;

  @Column({ type: 'varchar', length: 20, name: 'survey_status', default: () => `'completed'` })
  survey_status!: string;

  @Column({ type: 'datetime', name: 'presented_at', default: () => 'CURRENT_TIMESTAMP' })
  presented_at!: Date;

  @Column({ type: 'datetime', name: 'started_at', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'datetime', name: 'completed_at', nullable: true })
  completed_at!: Date | null;

  @Column({ type: 'datetime', name: 'date_added', default: () => 'CURRENT_TIMESTAMP' })
  date_added!: Date;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
