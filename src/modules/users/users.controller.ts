// ...existing code...
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
} from '@nestjs/common';

import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserWithHouseholdDto } from './dto/update-user-with-household.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import type { Request } from 'express';

interface JwtUser {
  email?: string;
  userId?: string;
  user_type?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  @Patch(':id/delete')
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDeleteUser(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restoreUser(id);
  }
  constructor(private readonly usersService: UsersService) {}

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
      identification_code: string;
    } = {
      ...createUserDto,
      email,
      cognito_uuid: userId,
      user_type,
      identification_code: createUserDto.identification_code ?? userId,
    };
    return this.usersService.create(dto);
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const user = req.user as (JwtUser & { id?: string }) | undefined;
    const cognitoUuid = user?.userId ?? user?.id ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new NotFoundException('User not found');
    // Get the full household template for PATCH
    const household = await this.usersService.getHouseholdTemplateForUser(dbUserId);
    return household;
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Get()
  async findByIdentificationCode(@Query('identification_code') identification_code: string) {
    return this.usersService.findByIdentificationCode(identification_code);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserWithHouseholdDto,
    @Req() _req: Request,
  ) {
    // Optionally, extract user info from JWT if needed
    await this.usersService.updateUserWithHousehold(id, updateUserDto);
    return { success: true };
  }
}
