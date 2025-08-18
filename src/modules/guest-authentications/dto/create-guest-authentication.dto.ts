import { IsOptional, IsString } from 'class-validator';

export class CreateGuestAuthenticationDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
