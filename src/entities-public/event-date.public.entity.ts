import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('event_dates', { database: 'freshtrak_public' })
export class PublicEventDate {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'event_date_id' })
  event_date_id!: number;

  @Column({ type: 'int', unsigned: true })
  event_id!: number;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'int' })
  reserved!: number;
}
