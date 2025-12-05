import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
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

  @Column({ type: 'datetime' })
  created_at: Date;

  @Column({ type: 'datetime' })
  updated_at: Date;

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
