import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
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

  @Column({ type: 'datetime' })
  created_at!: Date;

  @Column({ type: 'datetime' })
  updated_at!: Date;

  @BeforeInsert()
  setCreationDates(): void {
    const now = new Date();
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setUpdateDate(): void {
    this.updated_at = new Date();
  }
}
