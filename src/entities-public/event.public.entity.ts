import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('events', { database: 'freshtrak_public' })
export class PublicEvent {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'event_id' })
  event_id!: number;

  @Column({ type: 'varchar', length: 80, name: 'event_name' })
  name!: string;
}
