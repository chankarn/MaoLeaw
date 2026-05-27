// File: apps/api/src/modules/bills/bills.controller.ts
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { claimPaidSchema, type ClaimPaidInput } from '@maoleaw/shared';
import { BillsService } from './bills.service';

@Controller('/events/:eventId/my-bill')
@UseGuards(JwtAuthGuard)
@Roles('MEMBER')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get()
  myBill(@Param('eventId', ParseUUIDPipe) eventId: string, @CurrentUser() user: JwtPayload) {
    return this.bills.getMyBillForEvent(eventId, user.sub);
  }

  @Post('/claim')
  @HttpCode(200)
  claim(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(claimPaidSchema)) body: ClaimPaidInput,
  ) {
    return this.bills.claimPaid(eventId, user.sub, body.note);
  }
}
