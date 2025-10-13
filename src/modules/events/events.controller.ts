import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateTimeslotDto } from './dto/create-timeslot.dto';
import { UpdateTimeslotDto } from './dto/update-timeslot.dto';
import { ApiTags, ApiQuery, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { PublicScheduleService } from '../public-schedule/public-schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly publicSchedule: PublicScheduleService,
  ) {}

  @Get()
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  list(@Query('active') active?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const isActive = active === undefined ? undefined : active === 'true';
    return this.eventsService.list({ active: isActive, from, to });
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.get(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Post()
  @ApiCreatedResponse({ description: 'Event created' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Patch(':id')
  @ApiOkResponse({ description: 'Event updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Delete(':id')
  @ApiOkResponse({ description: 'Event deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.remove(id);
  }

  // Timeslots
  @Get(':id/timeslots')
  listTimeslots(@Param('id', ParseIntPipe) eventId: number) {
    return this.eventsService.listTimeslots(eventId);
  }

  // Legacy-style public date structure for today by default; accepts optional :eventDateId
  @Get(':id/public-date')
  async getPublicDateStructureDefault(@Param('id', ParseIntPipe) eventId: number) {
    const eventDateId = await this.publicSchedule.getEventDateIdDefault(eventId);
    if (!eventDateId) return { event_date: null };
    return this.publicSchedule.buildEventDateStructure(eventDateId);
  }

  @Get(':id/public-date/:eventDateId')
  getPublicDateStructure(
    @Param('id', ParseIntPipe) _eventId: number,
    @Param('eventDateId', ParseIntPipe) eventDateId: number,
  ) {
    return this.publicSchedule.buildEventDateStructure(eventDateId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Post(':id/timeslots')
  @ApiCreatedResponse({ description: 'Timeslot created' })
  createTimeslot(
    @Param('id', ParseIntPipe) eventId: number,
    @Body() body: Omit<CreateTimeslotDto, 'event_id'>,
  ) {
    return this.eventsService.createTimeslot({ ...body, event_id: eventId } as CreateTimeslotDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Patch('timeslots/:timeslotId')
  @ApiOkResponse({ description: 'Timeslot updated' })
  updateTimeslot(
    @Param('timeslotId', ParseIntPipe) timeslotId: number,
    @Body() dto: UpdateTimeslotDto,
  ) {
    return this.eventsService.updateTimeslot(timeslotId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Delete('timeslots/:timeslotId')
  @ApiOkResponse({ description: 'Timeslot deleted' })
  removeTimeslot(@Param('timeslotId', ParseIntPipe) timeslotId: number) {
    return this.eventsService.removeTimeslot(timeslotId);
  }
}
