import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('event_timeslots')
export class EventTimeslot {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  event_id!: number;

  @ManyToOne(() => Event, (e) => e.timeslots)
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ type: 'datetime' })
  start_at!: Date;

  @Column({ type: 'datetime' })
  end_at!: Date;

  @Column({ type: 'int', nullable: true, default: null })
  capacity?: number | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
