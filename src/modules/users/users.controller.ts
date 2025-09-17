import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe, Query, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import * as dns from 'dns';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../types/authenticated-request';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('user')
@ApiBearerAuth('JWT')
@Controller('api/user')
export class UsersController {
  // Public test endpoint to verify controller reachability
  @Get('test-public')
  getPublic() {
    return { status: 'ok' };
  }
  // DNS test endpoint
  @Get('dns-test')
  @ApiOperation({ summary: 'Test DNS resolution for Cognito endpoint' })
  async dnsTest() {
    return new Promise((resolve) => {
      dns.lookup('cognito-idp.us-east-2.amazonaws.com', (err, address) => {
        resolve({ err: err ? err.message : null, address });
      });
    });
  }
  constructor(private readonly usersService: UsersService) {}

  // GET /api/user
    @Get()
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Current user profile' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async show(@Req() req: AuthenticatedRequest) {
    console.log('GET /api/user req.user:', req.user);
    if (!req.user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return req.user;
  }

  // POST /api/user
    @Post()
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiOkResponse({ description: 'Created user' })
  async create(@Req() req: AuthenticatedRequest, @Body() createUserDto: CreateUserDto) {
    console.log('POST /api/user req.user:', req.user);
    return this.usersService.create(createUserDto);
  }

  // GET /api/user/:id
    @Get(':id')
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ description: 'User by id' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    console.log('GET /api/user/:id req.user:', req.user);
    return this.usersService.findById(id);
  }

  // GET /api/user/identification/:identification_code
    @Get('identification/:identification_code')
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by identification code' })
  @ApiOkResponse({ description: 'User by identification code' })
  async findByIdentificationCode(@Req() req: AuthenticatedRequest, @Param('identification_code') identification_code: string) {
    console.log('GET /api/user/identification/:identification_code req.user:', req.user);
    return this.usersService.findByIdentificationCode(identification_code);
  }

  // PATCH /api/user
    @Patch()
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'Updated user profile' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(@Req() req: AuthenticatedRequest, @Body() updateUserDto: UpdateUserDto) {
  console.log('PATCH /api/user req.user:', req.user);
  // For demo: use id from body, fallback to 1 if not provided
  const userId = updateUserDto.id || 1;
  return this.usersService.update(userId, updateUserDto);
  }
}
