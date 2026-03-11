/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ArrayUnique,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrantDto {
  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

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

  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : parseInt(String(value), 10),
  )
  seniors?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : parseInt(String(value), 10),
  )
  adults?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : parseInt(String(value), 10),
  )
  children?: number;
}

export class RegisterHouseholdCountsDto {
  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v =
      obj?.synth_seniors ??
      obj?.seniors ??
      obj?.seniors_count ??
      obj?.seniors_count ??
      obj?.seniors_in_household ??
      value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  seniors?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v =
      obj?.synth_adults ??
      obj?.adults ??
      obj?.adults_count ??
      obj?.adults_count ??
      obj?.adults_in_household ??
      value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  adults?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v =
      obj?.synth_children ??
      obj?.children ??
      obj?.children_count ??
      obj?.children_count ??
      obj?.children_in_household ??
      value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  children?: number;
}

export class RegisterDto {
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.event_id ?? obj?.eventId ?? value;
    return v === '' ? undefined : v;
  })
  event_id!: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.timeslot_id ?? obj?.timeslotId ?? obj?.timeSlotId ?? value;
    return v === '' ? undefined : v;
  })
  timeslot_id?: number;

  // Public DB identifiers (optional). If provided, capacity checks will use freshtrak_public.
  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.event_slot_id ?? obj?.eventSlotId ?? value;
    return v === '' ? undefined : v;
  })
  event_slot_id?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.event_date_id ?? obj?.eventDateId ?? value;
    return v === '' ? undefined : v;
  })
  event_date_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Transform(({ value, obj }) => {
    const v = obj?.attendees ?? obj?.attendeeIds ?? obj?.attendee_ids ?? value;
    return v === '' ? undefined : v;
  })
  attendees?: number[]; // household_member_id list

  // Optional household counts as a nested object (me-format)
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Transform(({ value }) => (typeof value === 'object' ? value : undefined))
  @Type(() => RegisterHouseholdCountsDto)
  counts?: RegisterHouseholdCountsDto;

  @ApiPropertyOptional({
    description:
      'Registrant data for case manager "register on behalf of" flow. Only accepted from users in the case_managers Cognito group.',
    type: RegistrantDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegistrantDto)
  registrant?: RegistrantDto;

  // Optional top-level aliases (simple format)
  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v =
      obj?.synth_seniors ??
      obj?.seniors ??
      obj?.seniors_count ??
      obj?.seniors_in_household ??
      value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  seniors?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v =
      obj?.synth_adults ?? obj?.adults ?? obj?.adults_count ?? obj?.adults_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  adults?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v =
      obj?.synth_children ??
      obj?.children ??
      obj?.children_count ??
      obj?.children_in_household ??
      value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  children?: number;
}
