import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
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

  // Optional references to public DB identifiers used for capacity updates
  @Column({ type: 'int', unsigned: true, nullable: true, default: null })
  public_event_slot_id?: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true, default: null })
  public_event_date_id?: number | null;

  @OneToMany(() => RegistrationAttendee, (a) => a.registration)
  attendees!: RegistrationAttendee[];

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
