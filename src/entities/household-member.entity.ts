import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Household } from './household.entity';

@Entity('household_members')
export class HouseholdMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', nullable: true })
  household_id!: number | null;

  @ManyToOne(() => Household, (household) => household.members)
  @JoinColumn({ name: 'household_id' })
  household!: Household;

  @Column({ type: 'bigint', nullable: true })
  user_id!: number | null;

  @Column({ type: 'int', nullable: true })
  number?: number | null;

  @Column({ type: 'varchar', length: 255 })
  first_name!: string;

  @Column({ nullable: true })
  middle_name?: string;

  @Column({ type: 'varchar', length: 255 })
  last_name!: string;

  // Note: phone/email are not present in the current MySQL schema

  @Column({ type: 'date' })
  date_of_birth!: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_head_of_household!: boolean;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active!: boolean;

  @Column({ type: 'varchar', length: 255 })
  added_by!: string;

  @Column({ type: 'bigint', nullable: true })
  gender_id?: number | null;

  @Column({ type: 'bigint', nullable: true })
  suffix_id?: number | null;

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
