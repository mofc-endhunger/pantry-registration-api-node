import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('form_responses')
export class FormResponse {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'bigint', unsigned: true })
  submission_id!: number;

  @Column({ type: 'int', unsigned: true })
  question_id!: number;

  @Column({ type: 'text' })
  answer_value!: string; // store as text to support different types
}
