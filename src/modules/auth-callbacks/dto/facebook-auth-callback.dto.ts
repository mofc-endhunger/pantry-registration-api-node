import { IsString, IsNotEmpty } from 'class-validator';

export class FacebookAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  userID: string;

  @IsString()
  @IsNotEmpty()
  graphDomain: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
