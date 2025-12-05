import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';

@Entity('user_details')
export class UserDetail {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  first_name!: string;

  @Column({ nullable: true })
  last_name!: string;

  @Column({ nullable: true })
  location!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  image!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  urls!: string;

  @Column({ type: 'datetime' })
  created_at!: Date;

  @Column({ type: 'datetime' })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.user_detail)
  user!: User;

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
