import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { EventTimeslot } from './event-timeslot.entity';
import { Household } from './household.entity';
import { RegistrationAttendee } from './registration-attendee.entity';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  event_id!: number;

  @ManyToOne(() => Event, (e) => e.registrations)
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ type: 'bigint' })
  household_id!: number;

  @ManyToOne(() => Household)
  @JoinColumn({ name: 'household_id' })
  household!: Household;

  @Column({ type: 'bigint', nullable: true, default: null })
  timeslot_id?: number | null;

  @ManyToOne(() => EventTimeslot, { nullable: true })
  @JoinColumn({ name: 'timeslot_id' })
  timeslot?: EventTimeslot | null;

  @Column({ type: 'varchar', length: 32 })
  status!: 'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in';

  @Column({ type: 'bigint' })
  created_by!: number;

  @OneToMany(() => RegistrationAttendee, (a) => a.registration)
  attendees!: RegistrationAttendee[];

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
