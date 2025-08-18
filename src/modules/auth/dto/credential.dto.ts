import { IsInt, IsString, IsOptional, IsBoolean, IsDateString, IsNotEmpty } from 'class-validator';

export class CredentialDto {
  @IsInt()
  @IsNotEmpty()
  user_id!: number;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsBoolean()
  @IsOptional()
  expires?: boolean;

  @IsDateString()
  @IsOptional()
  expires_at?: string;
}
