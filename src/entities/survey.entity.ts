import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'int', default: 1 })
  status_id!: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date_added!: Date;
}
