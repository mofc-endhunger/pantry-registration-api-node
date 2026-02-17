/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SubmitSurveyResponseDto {
  @IsInt()
  @Type(() => Number)
  @Transform(({ value, obj }) => obj?.question_id ?? value)
  question_id!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Transform(({ value, obj }) => obj?.answer_id ?? value)
  answer_id?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj?.answer_value ?? value)
  answer_value?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj?.answer_text ?? value)
  answer_text?: string;
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

  // Optional section context for staged submits
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Transform(({ value, obj }) => obj?.section_id ?? value)
  section_id?: number;

  // When false, treat this as a save-progress (in_progress); when true or omitted, finalize
  @IsOptional()
  @Transform(({ value, obj }) =>
    (obj?.is_final ?? value ?? true) === 'false' ? false : Boolean(obj?.is_final ?? value ?? true),
  )
  is_final?: boolean;

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
