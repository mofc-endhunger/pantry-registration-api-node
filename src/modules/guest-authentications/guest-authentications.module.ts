import { Module } from '@nestjs/common';
import { GuestAuthenticationsController } from './guest-authentications.controller';
import { GuestAuthenticationsService } from './guest-authentications.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
    }),
  ],
  controllers: [GuestAuthenticationsController],
  providers: [GuestAuthenticationsService],
})
export class GuestAuthenticationsModule {}
