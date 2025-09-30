import { IsOptional, IsString } from 'class-validator';
import { UpdateHouseholdDto } from '../../households/dto/update-household.dto';

export class UpdateUserWithHouseholdDto extends UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  address_line_1?: string;

  @IsOptional()
  @IsString()
  address_line_2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip_code?: string;
}
