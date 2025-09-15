import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateHouseholdDto {
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
  @IsOptional() @IsString()
  preferred_language?: string;
  @IsOptional() @IsString()
  notes?: string;

  // Primary member inline fields
  @IsOptional() @IsString()
  primary_first_name?: string;
  @IsOptional() @IsString()
  primary_last_name?: string;
  @IsOptional() @IsString()
  primary_phone?: string;
  @IsOptional() @IsString()
  primary_email?: string;
  @IsOptional() @IsDateString()
  primary_date_of_birth?: string;
}

