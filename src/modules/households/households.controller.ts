import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Uncomment if you want to secure endpoints

@ApiTags('households')
@ApiBearerAuth('JWT-auth')
@Controller('households')
// @UseGuards(JwtAuthGuard) // Uncomment to secure all endpoints
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new household' })
  @ApiResponse({ status: 201, description: 'Household created.' })
  create(@Body() createHouseholdDto: CreateHouseholdDto) {
    // TODO: Replace 1 with actual userId from auth context
    return this.householdsService.createHousehold(1, createHouseholdDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a household by ID' })
  @ApiResponse({ status: 200, description: 'Household found.' })
  findOne(@Param('id') id: string) {
    // TODO: Replace 1 with actual userId from auth context
    return this.householdsService.getHouseholdById(+id, 1);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a household by ID' })
  @ApiResponse({ status: 200, description: 'Household updated.' })
  update(@Param('id') id: string, @Body() updateHouseholdDto: UpdateHouseholdDto) {
    // TODO: Replace 1 with actual userId from auth context
    return this.householdsService.updateHousehold(+id, 1, updateHouseholdDto);
  }

  // No removeHousehold method in service; not implemented
}
