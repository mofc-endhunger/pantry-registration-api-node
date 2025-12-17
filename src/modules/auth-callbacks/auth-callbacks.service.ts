import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FacebookAuthCallbackDto } from './dto/facebook-auth-callback.dto';
import { Identity } from '../../entities/identity.entity';
import { User } from '../../entities/user.entity';
import { Authentication } from '../../entities/authentication.entity';
import { randomBytes } from 'crypto';
import { SafeRandom } from '../../common/utils/safe-random';

@Injectable()
export class AuthCallbacksService {
  constructor(
    @InjectRepository(Identity) private readonly identityRepo: Repository<Identity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Authentication) private readonly authRepo: Repository<Authentication>,
  ) {}

  async facebookCallback(facebookDto: FacebookAuthCallbackDto) {
    // 1. Verify Facebook token (stub, always true for now)
    const isValid = await this.verifyFacebookToken(facebookDto.accessToken, facebookDto.userID);
    if (!isValid) throw new UnauthorizedException('Invalid Facebook token');

    // 2. Find or create identity
    let identity = await this.identityRepo.findOne({ where: { provider_uid: facebookDto.userID } });
    let user: User;
    if (identity) {
      const foundUser = await this.userRepo.findOne({ where: { id: identity.user_id } });
      if (!foundUser) {
        throw new UnauthorizedException('User not found for identity');
      }
      user = foundUser;
    } else {
      user = this.userRepo.create({
        user_type: 'customer',
        identification_code: await this.generateUniqueCode(),
      });
      await this.userRepo.save(user);
      identity = this.identityRepo.create({
        user_id: user.id,
        provider_uid: facebookDto.userID,
        provider_type: facebookDto.graphDomain,
        auth_hash: facebookDto.accessToken,
        user,
      });
      await this.identityRepo.save(identity);
    }

    // 3. Create authentication
    const token = randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const authentication = this.authRepo.create({
      user_id: user.id,
      token,
      expires_at,
      user,
    });
    await this.authRepo.save(authentication);

    return authentication;
  }

  // Stub for Facebook token verification
  async verifyFacebookToken(accessToken: string, userID: string): Promise<boolean> {
    // TODO: Integrate with Facebook API
    return true;
  }

  // Generate unique 6-char code
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    do {
      code = SafeRandom.generateCode(6);
    } while (await this.userRepo.findOne({ where: { identification_code: code } }));
    return code;
  }
}
