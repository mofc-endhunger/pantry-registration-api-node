import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { HouseholdsModule } from '../households/households.module';
import { PantryTrakClient } from '../integrations/pantrytrak.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => HouseholdsModule),
    JwtModule.register({}),
  ],
  controllers: [UsersController],
  providers: [UsersService, PantryTrakClient],
  exports: [UsersService],
})
export class UsersModule {}
