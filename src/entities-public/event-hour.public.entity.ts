import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('event_hours', { database: 'freshtrak_public' })
export class PublicEventHour {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'event_hour_id' })
  event_hour_id!: number;

  @Column({ type: 'int', unsigned: true })
  event_date_id!: number;
}
