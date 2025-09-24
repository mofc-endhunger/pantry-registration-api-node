import { IsString, IsOptional, IsBoolean, IsInt, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  identification_code!: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  middle_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  suffix?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  phone?: string;

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

  @IsString()
  @IsOptional()
  license_plate?: string;

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

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsInt()
  @IsOptional()
  credential_id?: number;

  @IsInt()
  @IsOptional()
  user_detail_id?: number;
}
