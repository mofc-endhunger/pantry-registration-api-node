import { IsOptional, IsString } from 'class-validator';
import { UpdateHouseholdDto } from '../../households/dto/update-household.dto';

export class UpdateUserWithHouseholdDto extends UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  declare address_line_1?: string;

  @IsOptional()
  @IsString()
  declare address_line_2?: string;

  @IsOptional()
  @IsString()
  declare city?: string;

  @IsOptional()
  @IsString()
  declare state?: string;

  @IsOptional()
  @IsString()
  declare zip_code?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
