import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('event_dates', { database: 'freshtrak_public' })
export class PublicEventDate {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'event_date_id' })
  event_date_id!: number;

  @Column({ type: 'int', unsigned: true })
  event_id!: number;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ type: 'int', nullable: true })
  reserved!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  event_date_key!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  start_time_key!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  end_time_key!: number | null;
}
