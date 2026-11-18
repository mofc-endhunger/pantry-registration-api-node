/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  ForbiddenException,
  applyDecorators,
} from '@nestjs/common';

import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserWithHouseholdDto } from './dto/update-user-with-household.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import type { Request } from 'express';

interface JwtUser {
  email?: string;
  userId?: string;
  user_type?: string;
}

/**
 * Routes that act on ANY user by id or code (SUP-1168). None of the apps call
 * them; a signed-in member of the public must not be able to read, delete or
 * restore another person's account by guessing an integer.
 *
 * The Cognito pool has no `staff` or `admin` group today (its only group is
 * `case_managers`), so these routes are closed to EVERY caller, deliberately.
 * Creating one of those groups opens them to its members with no code change.
 * Do not add `case_managers` here: nothing in that flow needs to read an
 * arbitrary person's full record.
 */
const StaffOnly = () => applyDecorators(UseGuards(RolesGuard), Roles('staff', 'admin'));

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  @Patch(':id/delete')
  @StaffOnly()
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDeleteUser(id);
  }

  @Patch(':id/restore')
  @StaffOnly()
  async restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restoreUser(id);
  }
  constructor(private readonly usersService: UsersService) {}

  /** The users row behind the token; 404 when the token has none. */
  private async callerDbUserId(req: Request): Promise<number> {
    const user = req.user as (JwtUser & { id?: string }) | undefined;
    const cognitoUuid = user?.userId ?? user?.id ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new NotFoundException('User not found');
    return dbUserId;
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    // Extract email, uuid, and user_type from JWT (req.user)
    const user = req.user as (JwtUser & { id?: string }) | undefined;
    const email = user?.email ?? '';
    const userId = user?.userId ?? user?.id ?? '';
    const user_type = user?.user_type ?? 'registered';
    // Always use values from token, not body
    const dto: CreateUserDto & {
      email: string;
      cognito_uuid: string;
      user_type: string;
    } = {
      ...createUserDto,
      email,
      cognito_uuid: userId,
      user_type,
    };
    return this.usersService.create(dto);
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const dbUserId = await this.callerDbUserId(req);

    // Self-heal @auto.local emails using the email claim already present in the JWT
    const jwtEmail = (req.user as { email?: string } | undefined)?.email;
    if (jwtEmail) {
      try {
        await this.usersService.healAutoLocalEmail(dbUserId, jwtEmail);
      } catch {
        // non-critical
      }
    }

    const household = await this.usersService.getHouseholdTemplateForUser(dbUserId);
    try {
      const u = await this.usersService.findById(dbUserId);
      return { ...household, language_id: u.language_id ?? null };
    } catch {
      return { ...household, language_id: null };
    }
  }

  @Get(':id')
  @StaffOnly()
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Get()
  @StaffOnly()
  async findByIdentificationCode(@Query('identification_code') identification_code: string) {
    return this.usersService.findByIdentificationCode(identification_code);
  }

  /**
   * The path id must be the caller (SUP-1168). It used to be trusted as the
   * requester, so any signed-in user could overwrite another user's profile
   * and household by sending that user's id. Every app already sends its own
   * id, so the path stays for compatibility; it is checked, not believed.
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserWithHouseholdDto,
    @Req() req: Request,
  ) {
    const callerId = await this.callerDbUserId(req);
    if (callerId !== id) throw new ForbiddenException('You can only update your own profile');
    await this.usersService.updateUserWithHousehold(id, updateUserDto);
    return { success: true };
  }
}
