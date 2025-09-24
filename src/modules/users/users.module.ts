import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), HouseholdsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
