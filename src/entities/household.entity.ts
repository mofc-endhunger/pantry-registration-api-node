import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
