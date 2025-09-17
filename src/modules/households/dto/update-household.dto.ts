import { IsOptional, IsString } from 'class-validator';

export class UpdateHouseholdDto {
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
}

