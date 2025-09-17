import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { HouseholdMember } from './household-member.entity';
import { User } from './user.entity';

@Entity('households')
export class Household {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', nullable: true })
  primary_user_id?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'primary_user_id' })
  primary_user?: User;

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

  @Column({ nullable: true })
  preferred_language?: string;

  @Column({ nullable: true })
  notes?: string;

  @OneToMany(() => HouseholdMember, (member) => member.household)
  members!: HouseholdMember[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

