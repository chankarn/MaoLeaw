import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { adminAddAttendeeSchema, type AdminAddAttendeeInput } from '@maoleaw/shared';
import { SubmissionsService } from './submissions.service';

/** Admin edits an event's attendance (GET lives in AdminEventsController). */
@Controller('/admin/events/:eventId/attendees')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminAttendeesController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  add(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body(new ZodValidationPipe(adminAddAttendeeSchema)) body: AdminAddAttendeeInput,
  ) {
    return this.submissions.adminAdd(eventId, body);
  }

  @Delete(':memberId')
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.submissions.adminRemove(eventId, memberId);
  }
}
