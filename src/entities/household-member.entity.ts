import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Household } from './household.entity';

@Entity('household_members')
export class HouseholdMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  household_id!: number;

  @ManyToOne(() => Household, (household) => household.members)
  @JoinColumn({ name: 'household_id' })
  household!: Household;

  @Column({ default: false })
  is_primary!: boolean;

  @Column({ nullable: true })
  first_name?: string;

  @Column({ nullable: true })
  middle_name?: string;

  @Column({ nullable: true })
  last_name?: string;

  @Column({ nullable: true })
  suffix?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address_line_1?: string;

  @Column({ nullable: true })
  address_line_2?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  zip_code?: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth?: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}

