import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { EventTimeslot } from './event-timeslot.entity';
import { Registration } from './registration.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'datetime', nullable: true })
  start_at?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  end_at?: Date | null;

  @Column({ type: 'int', nullable: true, default: null })
  capacity?: number | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active!: boolean;

  @OneToMany(() => EventTimeslot, (t) => t.event)
  timeslots!: EventTimeslot[];

  @OneToMany(() => Registration, (r) => r.event)
  registrations!: Registration[];

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
