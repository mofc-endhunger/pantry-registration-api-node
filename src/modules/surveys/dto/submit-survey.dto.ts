import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitSurveyResponseDto {
  @IsInt()
  @Type(() => Number)
  question_id!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  answer_id?: number;

  @IsOptional()
  @IsString()
  answer_value?: string;

  @IsOptional()
  @IsString()
  answer_text?: string;
}

export class SubmitSurveyDto {
  @IsInt()
  @Type(() => Number)
  survey_id!: number;

  @IsInt()
  @Type(() => Number)
  trigger_id!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  registration_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  section_id?: number;

  @IsOptional()
  is_final?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  overall_rating?: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitSurveyResponseDto)
  responses!: SubmitSurveyResponseDto[];
}
