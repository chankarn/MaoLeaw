// File: apps/api/src/modules/bills/bills.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { claimPaidSchema, type ClaimPaidInput } from '@maoleaw/shared';
import { BillsService } from './bills.service';
import type { UploadedSlip } from '../slips/slip-verifier.service';

const MAX_SLIP_BYTES = 5 * 1024 * 1024;

@Controller('/events/:eventId/my-bill')
@UseGuards(JwtAuthGuard)
@Roles('MEMBER')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get()
  myBill(@Param('eventId', ParseUUIDPipe) eventId: string, @CurrentUser() user: JwtPayload) {
    return this.bills.getMyBillForEvent(eventId, user.sub);
  }

  /** multipart/form-data: `slip` (image, required) + optional `note`. */
  @Post('/claim')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('slip', { limits: { fileSize: MAX_SLIP_BYTES, files: 1 } }))
  claim(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() slip: UploadedSlip | undefined,
    @Body(new ZodValidationPipe(claimPaidSchema)) body: ClaimPaidInput,
  ) {
    if (!slip || !slip.mimetype.startsWith('image/')) {
      throw new BadRequestException('กรุณาแนบรูปสลิปการโอนเงิน');
    }
    return this.bills.claimPaid(eventId, user.sub, body.note, slip);
  }
}
