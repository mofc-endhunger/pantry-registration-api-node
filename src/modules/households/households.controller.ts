import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UsersService } from '../users/users.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('households')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('households')
export class HouseholdsController {
  constructor(
    private readonly householdsService: HouseholdsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new household' })
  @ApiResponse({ status: 201, description: 'Household created.' })
  async create(@Body() createHouseholdDto: CreateHouseholdDto, @Req() req: Request) {
    const user = req.user as { id?: string; userId?: string } | undefined;
    const cognitoUuid = user?.id ?? user?.userId ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new NotFoundException('User not found');
    return this.householdsService.createHousehold(dbUserId, createHouseholdDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a household by ID' })
  @ApiResponse({ status: 200, description: 'Household found.' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id?: string; userId?: string } | undefined;
    const cognitoUuid = user?.id ?? user?.userId ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new NotFoundException('User not found');
    return this.householdsService.getHouseholdById(+id, dbUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a household by ID' })
  @ApiResponse({ status: 200, description: 'Household updated.' })
  @ApiResponse({
    status: 200,
    description: 'Multi-table household update',
    schema: {
      example: {
        id: 20,
        number: 0,
        name: 'Shvyrev Household',
        identification_code: '1759153314799-801',
        added_by: 1130520,
        last_updated_by: 1130520,
        deleted_by: null,
        deleted_on: null,
        members: [
          {
            id: 36,
            household_id: 20,
            user_id: '1130520',
            number: null,
            first_name: 'Alexander',
            middle_name: null,
            last_name: 'Shvyrev',
            date_of_birth: '1900-01-01',
            is_head_of_household: 1,
            is_active: 1,
            added_by: '1130520',
            gender_id: null,
            suffix_id: null,
            created_at: null,
            updated_at: null,
          },
        ],
        created_at: null,
        updated_at: null,
        counts: {
          seniors: 1,
          adults: 1,
          children: 0,
          total: 1,
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateHouseholdDto: UpdateHouseholdDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id?: string; userId?: string } | undefined;
    const cognitoUuid = user?.id ?? user?.userId ?? '';
    const dbUserId = await this.usersService.findDbUserIdByCognitoUuid(cognitoUuid);
    if (!dbUserId) throw new NotFoundException('User not found');
    return this.householdsService.updateHousehold(+id, dbUserId, updateHouseholdDto);
  }

  // No removeHousehold method in service; not implemented
}
