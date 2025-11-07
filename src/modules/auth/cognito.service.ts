import { Injectable } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as crypto from 'crypto';

@Injectable()
export class CognitoService {
  private client: any;

  constructor() {
    this.client = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION });
    console.log('[CognitoService] Loaded ClientId:', process.env.COGNITO_CLIENT_ID);
    console.log('[CognitoService] Loaded UserPoolId:', process.env.COGNITO_USER_POOL_ID);
    console.log('[CognitoService] Loaded ClientSecret:', process.env.COGNITO_CLIENT_SECRET);
  }
  private getSecretHash(username: string): string {
    const clientId = process.env.COGNITO_CLIENT_ID || '';
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || '';
    return crypto
      .createHmac('SHA256', clientSecret)
      .update(username + clientId)
      .digest('base64');
  }

  async signUp(email: string, password: string) {
    const command = new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      SecretHash: this.getSecretHash(email),
    });
    return this.client.send(command);
  }

  async signIn(email: string, password: string) {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: this.getSecretHash(email),
      },
    });
    return this.client.send(command);
  }
}
