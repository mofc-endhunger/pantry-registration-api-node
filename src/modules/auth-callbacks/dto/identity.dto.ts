import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class IdentityDto {
  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @IsString()
  @IsNotEmpty()
  provider_uid: string;

  @IsString()
  @IsNotEmpty()
  provider_type: string;

  @IsString()
  @IsNotEmpty()
  auth_hash: string;
}
