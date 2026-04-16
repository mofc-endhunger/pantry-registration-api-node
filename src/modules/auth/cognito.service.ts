import { Injectable } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as crypto from 'crypto';

@Injectable()
export class CognitoService {
  private client: CognitoIdentityProviderClient;

  constructor() {
    this.client = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION });
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

  /**
   * Look up a Cognito user's email by their `sub` (UUID).
   * Returns null when the attribute is absent or the call fails.
   */
  async getEmailBySub(sub: string): Promise<string | null> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: sub,
      });
      const result = await this.client.send(command);
      const emailAttr = result.UserAttributes?.find((a) => a.Name === 'email');
      return emailAttr?.Value ?? null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[CognitoService] getEmailBySub failed for',
        sub,
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  }
}
