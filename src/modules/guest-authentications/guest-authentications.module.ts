import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestAuthenticationsController } from './guest-authentications.controller';
import { GuestAuthenticationsService } from './guest-authentications.service';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Authentication])],
  controllers: [GuestAuthenticationsController],
  providers: [GuestAuthenticationsService],
})
export class GuestAuthenticationsModule {}
