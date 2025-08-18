import { IsInt, IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class AuthenticationDto {
  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsDateString()
  @IsNotEmpty()
  expires_at: string;
}
