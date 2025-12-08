import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Registration } from './registration.entity';

@Entity('checkin_audits')
export class CheckInAudit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  registration_id!: number;

  @ManyToOne(() => Registration)
  @JoinColumn({ name: 'registration_id' })
  registration!: Registration;

  @Column({ type: 'bigint' })
  created_by!: number;

  @Column({ type: 'int', nullable: true, default: null })
  attendees_count?: number | null;

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
