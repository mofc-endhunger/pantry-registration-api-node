import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class UpsertMemberDto {
  @IsOptional() @IsString()
  first_name?: string;
  @IsOptional() @IsString()
  middle_name?: string;
  @IsOptional() @IsString()
  last_name?: string;
  @IsOptional() @IsString()
  suffix?: string;
  @IsOptional() @IsString()
  gender?: string;
  @IsOptional() @IsString()
  phone?: string;
  @IsOptional() @IsString()
  email?: string;
  @IsOptional() @IsString()
  address_line_1?: string;
  @IsOptional() @IsString()
  address_line_2?: string;
  @IsOptional() @IsString()
  city?: string;
  @IsOptional() @IsString()
  state?: string;
  @IsOptional() @IsString()
  zip_code?: string;
  @IsOptional() @IsDateString()
  date_of_birth?: string;
  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

