import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UsersService } from '../users/users.service';
import type { Request } from 'express';

@ApiTags('households')
@ApiBearerAuth('JWT-auth')
@Controller('households')
// @UseGuards(JwtAuthGuard) // Uncomment to secure all endpoints
export class HouseholdsController {
  constructor(
    private readonly householdsService: HouseholdsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new household' })
  @ApiResponse({ status: 201, description: 'Household created.' })
  async create(@Body() createHouseholdDto: CreateHouseholdDto, @Req() req: Request) {
    const user = req.user as any;
    const cognitoUuid = user?.userId ?? user?.id ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new Error('User not found');
    return this.householdsService.createHousehold(dbUserId, createHouseholdDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a household by ID' })
  @ApiResponse({ status: 200, description: 'Household found.' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    const cognitoUuid = user?.userId ?? user?.id ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new Error('User not found');
    return this.householdsService.getHouseholdById(+id, dbUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a household by ID' })
  @ApiResponse({ status: 200, description: 'Household updated.' })
  async update(
    @Param('id') id: string,
    @Body() updateHouseholdDto: UpdateHouseholdDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const cognitoUuid = user?.userId ?? user?.id ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new Error('User not found');
    return this.householdsService.updateHousehold(+id, dbUserId, updateHouseholdDto);
  }

  // No removeHousehold method in service; not implemented
}
