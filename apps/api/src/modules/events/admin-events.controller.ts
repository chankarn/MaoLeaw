// File: apps/api/src/modules/events/admin-events.controller.ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createEventSchema, updateEventSchema, type CreateEventInput, type UpdateEventInput } from '@maoleaw/shared';
import { EventsService } from './events.service';

@Controller('/admin/events')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminEventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.events.listAdmin({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      status,
      search,
    });
  }

  @Get('/options/for-bill')
  forBill() {
    return this.events.listOptionsForBill();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.getRawAdmin(id);
  }

  @Get(':id/attendees')
  attendees(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.listAttendees(id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventInput,
  ) {
    return this.events.createAdmin(user.sub, body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEventSchema)) body: UpdateEventInput,
  ) {
    return this.events.updateAdmin(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.deleteAdmin(id);
  }
}
