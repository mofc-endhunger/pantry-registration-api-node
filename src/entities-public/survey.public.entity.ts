import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('surveys')
export class PublicSurvey {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'survey_id' })
  survey_id!: number;

  @Column({ type: 'int', unsigned: true, name: 'parent_survey_id', nullable: true })
  parent_survey_id!: number | null;

  @Column({ type: 'smallint', unsigned: true, name: 'language_id' })
  language_id!: number;

  @Column({ type: 'varchar', length: 255, name: 'survey_title' })
  survey_title!: string;

  @Column({ type: 'tinyint', unsigned: true, name: 'survey_type_id', nullable: true })
  survey_type_id!: number | null;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
