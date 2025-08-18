import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsEnum(['guest', 'customer'])
  @IsOptional()
  user_type?: 'guest' | 'customer';
}
