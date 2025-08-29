import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe, Query, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('user')
@ApiBearerAuth()
@Controller('api/user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/user
  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Current user profile' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async show(@Req() req: AuthenticatedRequest) {
  // user is inferred from auth token
  console.log('req.user in controller:', req.user);
  if (!req.user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  return req.user;
  }

  // POST /api/user
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiOkResponse({ description: 'Created user' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /api/user/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ description: 'User by id' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  // GET /api/user/identification/:identification_code
  @Get('identification/:identification_code')
  @ApiOperation({ summary: 'Get user by identification code' })
  @ApiOkResponse({ description: 'User by identification code' })
  async findByIdentificationCode(@Param('identification_code') identification_code: string) {
    return this.usersService.findByIdentificationCode(identification_code);
  }

  // PATCH /api/user
  @Patch()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'Updated user profile' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(@Req() req: AuthenticatedRequest, @Body() updateUserDto: UpdateUserDto) {
    if (!req.user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.usersService.update(req.user.id, updateUserDto);
  }
}
