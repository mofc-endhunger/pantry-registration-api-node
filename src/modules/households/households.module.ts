import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Household, HouseholdMember])],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
