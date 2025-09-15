import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';
import { HouseholdMemberAudit } from '../../entities/household-member-audit.entity';
import { HouseholdsService } from './households.service';
import { HouseholdsController } from './households.controller';
import { MembersController } from './members.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Household, HouseholdMember, HouseholdMemberAudit])],
  controllers: [HouseholdsController, MembersController],
  providers: [HouseholdsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}

