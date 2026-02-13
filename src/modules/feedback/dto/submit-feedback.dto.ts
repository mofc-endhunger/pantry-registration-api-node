/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitFeedbackResponseDto {
  @IsInt()
  @Type(() => Number)
  question_id!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  scale_value?: number;
}

export class SubmitFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitFeedbackResponseDto)
  responses?: SubmitFeedbackResponseDto[];
}
