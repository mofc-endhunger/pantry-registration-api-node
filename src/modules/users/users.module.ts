import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { UserDetail } from '../../entities/user-detail.entity';
import { HouseholdsModule } from '../households/households.module';
import { PantryTrakClient } from '../integrations/pantrytrak.client';
import { CognitoService } from '../auth/cognito.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDetail]),
    forwardRef(() => HouseholdsModule),
    JwtModule.register({}),
  ],
  controllers: [UsersController],
  providers: [UsersService, PantryTrakClient, CognitoService],
  exports: [UsersService],
})
export class UsersModule {}
