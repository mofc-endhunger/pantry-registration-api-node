import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserDetail } from './user-detail.entity';
import { Authentication } from './authentication.entity';
import { Identity } from './identity.entity';

@Entity('users')
export class User {
  @Column({ type: 'datetime', nullable: true, default: null })
  deleted_on?: Date | null;
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({
    type: 'binary',
    length: 16,
    nullable: true,
    default: null,
  })
  cognito_uuid?: Buffer | null;

  @Column({ type: 'varchar', length: 255 })
  user_type!: string;

  @CreateDateColumn({ type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updated_at!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  first_name?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  middle_name?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  last_name?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  suffix?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  gender?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  phone?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  email?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  address_line_1?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  address_line_2?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  city?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  state?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  zip_code?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  license_plate?: string | null;

  @Column({ type: 'int', nullable: true, default: null })
  seniors_in_household?: number | null;

  @Column({ type: 'int', nullable: true, default: null })
  adults_in_household?: number | null;

  @Column({ type: 'int', nullable: true, default: null })
  children_in_household?: number | null;

  @Column({ type: 'tinyint', width: 1, nullable: true, default: null })
  permission_to_email?: boolean | null;

  @Column({ type: 'tinyint', width: 1, nullable: true, default: null })
  permission_to_text?: boolean | null;

  @Column({ type: 'date', nullable: true, default: null })
  date_of_birth?: string | null;

  @Column({ type: 'varchar', length: 255 })
  identification_code!: string;

  @Column({ type: 'bigint', nullable: true, default: null })
  credential_id?: number | null;

  @Column({ type: 'bigint', nullable: true, default: null })
  user_detail_id?: number | null;

  @OneToOne(() => UserDetail, (detail) => detail.user)
  @JoinColumn({ name: 'user_detail_id' })
  user_detail?: UserDetail;

  @OneToMany(() => Authentication, (auth) => auth.user)
  authentications!: Authentication[];

  @OneToMany(() => Identity, (identity) => identity.user)
  identities!: Identity[];
}
