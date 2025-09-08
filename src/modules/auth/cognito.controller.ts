import { Controller, Post, Body } from '@nestjs/common';
import { CognitoService } from './cognito.service';

@Controller('cognito')
export class CognitoController {
  constructor(private readonly cognitoService: CognitoService) {}

  @Post('signup')
  async signUp(@Body() body: { email: string; password: string }) {
    return this.cognitoService.signUp(body.email, body.password);
  }

  @Post('signin')
  async signIn(@Body() body: { email: string; password: string }) {
    return this.cognitoService.signIn(body.email, body.password);
  }
}
