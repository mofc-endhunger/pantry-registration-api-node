import { Module } from '@nestjs/common';
import { GuestAuthenticationsController } from './guest-authentications.controller';
import { GuestAuthenticationsService } from './guest-authentications.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { jwtConstants } from '../auth/constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Authentication]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
    }),
  ],
  controllers: [GuestAuthenticationsController],
  providers: [GuestAuthenticationsService],
})
export class GuestAuthenticationsModule {}
