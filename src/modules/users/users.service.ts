import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HouseholdsService } from '../households/households.service';
import { UpsertMemberDto } from '../households/dto/upsert-member.dto';

@Injectable()
export class UsersService {
  async findDbUserIdByCognitoUuid(cognitoUuid: string): Promise<number | null> {
    const user = await this.userRepository.findOne({
      where: { cognito_uuid: Buffer.from(cognitoUuid, 'hex') },
    });
    return user ? user.id : null;
  }
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => HouseholdsService))
    private readonly householdsService: HouseholdsService,
  ) {}

  async create(
    createUserDto: CreateUserDto & { email: string; cognito_uuid: string; user_type: string },
  ): Promise<User> {
    // Assign Cognito fields and user_type safely
    const user = this.userRepository.create({
      identification_code: createUserDto.identification_code,
      first_name: createUserDto.first_name,
      middle_name: createUserDto.middle_name,
      last_name: createUserDto.last_name,
      suffix: createUserDto.suffix,
      gender: createUserDto.gender,
      phone: createUserDto.phone,
      address_line_1: createUserDto.address_line_1,
      address_line_2: createUserDto.address_line_2,
      city: createUserDto.city,
      state: createUserDto.state,
      zip_code: createUserDto.zip_code,
      license_plate: createUserDto.license_plate,
      seniors_in_household: createUserDto.seniors_in_household,
      adults_in_household: createUserDto.adults_in_household,
      children_in_household: createUserDto.children_in_household,
      permission_to_email: createUserDto.permission_to_email,
      permission_to_text: createUserDto.permission_to_text,
      date_of_birth: createUserDto.date_of_birth,
      credential_id: createUserDto.credential_id,
      user_detail_id: createUserDto.user_detail_id,
      user_type: createUserDto.user_type || 'registered',
      email: createUserDto.email,
      cognito_uuid: createUserDto.cognito_uuid
        ? Buffer.from(createUserDto.cognito_uuid, 'hex')
        : undefined,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const savedUser = (await this.userRepository.save(user)) as User;

    // Always use savedUser.id for all downstream calls
    const userId = savedUser.id;

    // Create household and add user as head_of_household
    const household = await this.householdsService.createHousehold(userId, {
      primary_first_name: savedUser.first_name ?? undefined,
      primary_last_name: savedUser.last_name ?? undefined,
      primary_phone: savedUser.phone ?? undefined,
      primary_email: savedUser.email ?? undefined,
      primary_date_of_birth: savedUser.date_of_birth ?? undefined,
    });

    // Type guard for household object
    const householdId: number =
      typeof household === 'object' &&
      household !== null &&
      'id' in household &&
      typeof (household as { id: unknown }).id === 'number'
        ? (household as { id: number }).id
        : 0;

    // Add placeholder members if counts are set
    const addPlaceholders = async (count: number, label: string) => {
      for (let i = 1; i <= count; i++) {
        const member: UpsertMemberDto = {
          first_name: `${label} ${i}`,
          last_name: label,
          is_active: true,
        };
        await this.householdsService.addMember(householdId, userId, member);
      }
    };
    if (typeof createUserDto.seniors_in_household === 'number') {
      await addPlaceholders(createUserDto.seniors_in_household, 'Senior');
    }
    if (typeof createUserDto.adults_in_household === 'number') {
      await addPlaceholders(createUserDto.adults_in_household, 'Adult');
    }
    if (typeof createUserDto.children_in_household === 'number') {
      await addPlaceholders(createUserDto.children_in_household, 'Child');
    }

    return savedUser;
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdentificationCode(identification_code: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ identification_code });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    // Prepare update object for repository
    const update: Record<string, unknown> = { ...updateUserDto };
    if (typeof updateUserDto.cognito_uuid === 'string') {
      update.cognito_uuid = Buffer.from(updateUserDto.cognito_uuid, 'hex');
    }
    await this.userRepository.update(id, update);
    return this.findById(id);
  }
}
