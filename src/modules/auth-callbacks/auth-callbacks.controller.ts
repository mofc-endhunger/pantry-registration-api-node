import { Controller, Post, Body } from '@nestjs/common';
import { AuthCallbacksService } from './auth-callbacks.service';
import { FacebookAuthCallbackDto } from './dto/facebook-auth-callback.dto';

@Controller('auth-callbacks')
export class AuthCallbacksController {
  constructor(private readonly authCallbacksService: AuthCallbacksService) {}

  @Post('facebook')
  async facebookCallback(@Body() facebookAuthCallbackDto: FacebookAuthCallbackDto) {
    return this.authCallbacksService.facebookCallback(facebookAuthCallbackDto);
  }
}
