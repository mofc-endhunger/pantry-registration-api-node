import { Module } from '@nestjs/common';
import { GuestAuthenticationsController } from './guest-authentications.controller';
import { GuestAuthenticationsService } from './guest-authentications.service';

@Module({
  controllers: [GuestAuthenticationsController],
  providers: [GuestAuthenticationsService],
})
export class GuestAuthenticationsModule {}
