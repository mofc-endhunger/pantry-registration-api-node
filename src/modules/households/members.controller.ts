import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertMemberDto } from './dto/upsert-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/members')
export class MembersController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  async list(@Req() req: any, @Param('householdId') householdId: string) {
    const userId = req.user?.id;
    return this.householdsService.listMembers(+householdId, userId);
  }

  @Post()
  async add(@Req() req: any, @Param('householdId') householdId: string, @Body() dto: UpsertMemberDto) {
    const userId = req.user?.id;
    return this.householdsService.addMember(+householdId, userId, dto);
  }

  @Patch(':memberId')
  async update(@Req() req: any, @Param('householdId') householdId: string, @Param('memberId') memberId: string, @Body() dto: UpsertMemberDto) {
    const userId = req.user?.id;
    return this.householdsService.updateMember(+householdId, +memberId, userId, dto);
  }

  @Delete(':memberId')
  async remove(@Req() req: any, @Param('householdId') householdId: string, @Param('memberId') memberId: string) {
    const userId = req.user?.id;
    return this.householdsService.deactivateMember(+householdId, +memberId, userId);
  }
}

