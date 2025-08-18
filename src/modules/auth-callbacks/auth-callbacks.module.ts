import { Module } from '@nestjs/common';
import { AuthCallbacksController } from './auth-callbacks.controller';
import { AuthCallbacksService } from './auth-callbacks.service';

@Module({
  controllers: [AuthCallbacksController],
  providers: [AuthCallbacksService],
})
export class AuthCallbacksModule {}
