import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('types_answer')
export class PublicAnswerType {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true, name: 'answer_type_id' })
  answer_type_id!: number;

  @Column({ type: 'varchar', length: 100, name: 'answer_type_name' })
  answer_type_name!: string;

  @Column({ type: 'varchar', length: 30, name: 'answer_type_code' })
  answer_type_code!: string;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: () => '1' })
  status_id!: number;
}
