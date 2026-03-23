import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  prompt!: string;

  @Column({ type: 'enum', enum: ['scale_1_5', 'radio', 'checkbox', 'short_text'] })
  type!: 'scale_1_5' | 'radio' | 'checkbox' | 'short_text';

  @Column({ type: 'tinyint', width: 1, default: () => '1' })
  is_standardized!: boolean;
}
