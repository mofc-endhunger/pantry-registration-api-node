import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('feedback_responses')
export class FeedbackResponse {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  feedback_id!: number;

  @Column({ type: 'int' })
  question_id!: number;

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  scale_value!: number | null; // 1–5
}
