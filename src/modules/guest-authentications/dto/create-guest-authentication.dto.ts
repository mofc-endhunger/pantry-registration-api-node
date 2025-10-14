import { IsOptional, IsString, IsBoolean, IsDateString, IsInt } from 'class-validator';

export class CreateGuestAuthenticationDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsOptional()
  address_line_1?: string;

  @IsString()
  @IsOptional()
  address_line_2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip_code?: string;

  @IsInt()
  @IsOptional()
  seniors_in_household?: number;

  @IsInt()
  @IsOptional()
  adults_in_household?: number;

  @IsInt()
  @IsOptional()
  children_in_household?: number;

  @IsBoolean()
  @IsOptional()
  permission_to_email?: boolean;

  @IsBoolean()
  @IsOptional()
  permission_to_text?: boolean;
}
