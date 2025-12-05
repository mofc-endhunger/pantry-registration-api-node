import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { HouseholdMember } from './household-member.entity';

import { HouseholdAddress } from './household-address.entity';

@Entity('households')
export class Household {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  number!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  identification_code!: string;

  @Column({ type: 'int' })
  added_by!: number;

  @Column({ type: 'int' })
  last_updated_by!: number;

  @Column({ type: 'int', nullable: true })
  deleted_by?: number | null;

  @Column({ type: 'datetime', nullable: true })
  deleted_on?: Date | null;

  @OneToMany(() => HouseholdMember, (member) => member.household)
  members!: HouseholdMember[];

  @OneToMany(() => HouseholdAddress, (address) => address.household)
  addresses!: HouseholdAddress[];

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
