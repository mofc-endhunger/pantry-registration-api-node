import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateHouseholdDto) {
    const userId = req.user?.id;
    return this.householdsService.createHousehold(userId, dto);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    return this.householdsService.getHouseholdById(+id, userId);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateHouseholdDto) {
    const userId = req.user?.id;
    return this.householdsService.updateHousehold(+id, userId, dto);
  }

  @Get()
  async getMine(@Req() req: any) {
    const userId = req.user?.id;
    return this.householdsService.getHouseholdForPrimary(userId);
  }
}

