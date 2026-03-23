import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('answer_options')
export class AnswerOption {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  question_id!: number;

  @Column({ type: 'varchar', length: 255 })
  value!: string; // canonical value id or text

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'int', default: 0 })
  display_order!: number;
}
