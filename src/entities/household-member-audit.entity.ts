import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('household_member_audits')
export class HouseholdMemberAudit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  household_id!: number;

  @Column({ type: 'bigint', nullable: true })
  member_id?: number;

  @Column()
  change_type!: string; // created | updated | deactivated | reactivated | removed | primary_changed | address_updated

  @Column({ type: 'bigint', nullable: true })
  changed_by_user_id?: number;

  @Column({ type: 'json', nullable: true })
  changes?: any; // { before, after }

  @CreateDateColumn()
  created_at!: Date;
}

