import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('surveys', { database: 'freshtrak_public' })
export class PublicSurvey {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'survey_id' })
  survey_id!: number;

  @Column({ type: 'varchar', length: 255, name: 'survey_title' })
  survey_title!: string;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
