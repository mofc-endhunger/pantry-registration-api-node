import { Module } from '@nestjs/common';
import { AuthCallbacksController } from './auth-callbacks.controller';
import { AuthCallbacksService } from './auth-callbacks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Identity } from '../../entities/identity.entity';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Identity, User, Authentication])],
  controllers: [AuthCallbacksController],
  providers: [AuthCallbacksService],
})
export class AuthCallbacksModule {}
