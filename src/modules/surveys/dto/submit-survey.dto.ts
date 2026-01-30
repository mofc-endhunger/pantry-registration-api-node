/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SubmitSurveyResponseDto {
  @IsInt()
  @Transform(({ value, obj }) => obj?.question_id ?? value)
  question_id!: number;

  @IsString()
  @Transform(({ value, obj }) => obj?.answer_value ?? value)
  answer_value!: string;
}

export class SubmitSurveyDto {
  @IsInt()
  @Transform(({ value, obj }) => obj?.survey_id ?? value)
  survey_id!: number;

  @IsInt()
  @Transform(({ value, obj }) => obj?.trigger_id ?? value)
  trigger_id!: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => obj?.registration_id ?? value)
  registration_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value, obj }) => obj?.overall_rating ?? value)
  overall_rating?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj?.comments ?? value)
  comments?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitSurveyResponseDto)
  @Transform(({ value, obj }) => obj?.responses ?? value)
  responses!: SubmitSurveyResponseDto[];
}
