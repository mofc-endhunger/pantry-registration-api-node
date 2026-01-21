import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('dim_times', { database: 'freshtrak_public' })
export class PublicDimTime {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'time_key' })
  time_key!: number;

  @Column({ type: 'time' })
  mysql_time!: string; // e.g., '14:30:00'
}
