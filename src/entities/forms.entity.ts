import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'int', default: 1 })
  status_id!: number; // 1=active, else inactive

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
