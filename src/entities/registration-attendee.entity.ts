import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Registration } from './registration.entity';
import { HouseholdMember } from './household-member.entity';

@Entity('registration_attendees')
export class RegistrationAttendee {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  registration_id!: number;

  @ManyToOne(() => Registration, (r) => r.attendees)
  @JoinColumn({ name: 'registration_id' })
  registration!: Registration;

  @Column({ type: 'bigint' })
  household_member_id!: number;

  @ManyToOne(() => HouseholdMember)
  @JoinColumn({ name: 'household_member_id' })
  household_member!: HouseholdMember;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
