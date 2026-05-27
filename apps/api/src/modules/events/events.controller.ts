// File: apps/api/src/modules/events/events.controller.ts
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { EventsService } from './events.service';

@Controller('/events')
@UseGuards(JwtAuthGuard)
@Roles('MEMBER')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('scope') scope = 'active') {
    if (scope === 'mine') return this.events.listMine(user.sub).then((items) => ({ items }));
    return this.events.listActive(user.sub).then((items) => ({ items }));
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.events.getDetail(id, user.sub);
  }
}
