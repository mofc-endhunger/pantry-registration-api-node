import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserDetail } from './user-detail.entity';
import { Authentication } from './authentication.entity';
import { Identity } from './identity.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  identification_code!: string;


  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  credential_id!: number;


  @Column({ type: 'enum', enum: ['guest', 'customer'] })
  user_type!: 'guest' | 'customer';

  @OneToOne(() => UserDetail, (detail) => detail.user)
  @JoinColumn({ name: 'user_detail_id' })
  user_detail!: UserDetail;

  @OneToMany(() => Authentication, (auth) => auth.user)
  authentications!: Authentication[];

  @OneToMany(() => Identity, (identity) => identity.user)
  identities!: Identity[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
