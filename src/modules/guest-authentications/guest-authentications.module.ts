import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { GuestAuthenticationsController } from './guest-authentications.controller';
import { GuestAuthenticationsService } from './guest-authentications.service';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { PantryTrakClient } from '../integrations/pantrytrak.client';

@Module({
  imports: [TypeOrmModule.forFeature([User, Authentication]), JwtModule.register({})],
  controllers: [GuestAuthenticationsController],
  providers: [GuestAuthenticationsService, PantryTrakClient],
})
export class GuestAuthenticationsModule {}
