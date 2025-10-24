import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('event_slots', { database: 'freshtrak_public' })
export class PublicEventSlot {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'event_slot_id' })
  event_slot_id!: number;

  @Column({ type: 'int', unsigned: true })
  event_hour_id!: number;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'int' })
  reserved!: number;
}
