import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Household } from './household.entity';

@Entity('household_addresses')
export class HouseholdAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  household_id: number;

  @ManyToOne(() => Household, (household) => household.addresses)
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @Column()
  line_1: string;

  @Column({ nullable: true })
  line_2: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  zip_code: string;

  @Column({ nullable: true })
  zip_4: string;

  @Column()
  added_by: number;

  @Column()
  last_updated_by: number;

  @Column({ nullable: true })
  deleted_by: number;

  @Column({ nullable: true })
  deleted_on: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
