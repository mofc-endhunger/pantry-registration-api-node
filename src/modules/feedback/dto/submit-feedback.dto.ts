/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SubmitFeedbackResponseDto {
  @IsInt()
  @Transform(({ value, obj }) => obj?.question_id ?? value)
  question_id!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value, obj }) => obj?.scale_value ?? value)
  scale_value?: number;
}

export class SubmitFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value, obj }) => obj?.rating ?? value)
  rating!: number;

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj?.comments ?? value)
  comments?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitFeedbackResponseDto)
  @Transform(({ value, obj }) => obj?.responses ?? value)
  responses?: SubmitFeedbackResponseDto[];
}
