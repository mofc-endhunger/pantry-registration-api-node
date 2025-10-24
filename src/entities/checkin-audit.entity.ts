import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
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

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
