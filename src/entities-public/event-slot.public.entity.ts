import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('event_slots', { database: 'freshtrak_public' })
export class PublicEventSlot {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'event_slot_id' })
  event_slot_id!: number;

  @Column({ type: 'int', unsigned: true })
  event_hour_id!: number;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ type: 'int', nullable: true })
  reserved!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  start_time_key!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  end_time_key!: number | null;
}
