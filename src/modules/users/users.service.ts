import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const now = new Date();
    const user = this.userRepository.create({
      ...createUserDto,
      created_at: now,
      updated_at: now,
    });
    return this.userRepository.save(user);
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdentificationCode(identification_code: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ identification_code });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
  const now = new Date();
  let user = await this.findById(id);
  Object.assign(user, updateUserDto, { updated_at: now });
  return this.userRepository.save(user);
  }
}
