// File: apps/api/src/modules/submissions/submissions.controller.ts
import { Body, Controller, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { submitAttendanceSchema, type SubmitAttendanceInput } from '@maoleaw/shared';
import { SubmissionsService } from './submissions.service';

@Controller('/events/:eventId/submission')
@UseGuards(JwtAuthGuard)
@Roles('MEMBER')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Put()
  upsert(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(submitAttendanceSchema)) body: SubmitAttendanceInput,
  ) {
    return this.submissions.upsert(eventId, user.sub, body);
  }
}
