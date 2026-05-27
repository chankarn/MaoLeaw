// File: apps/api/src/modules/bills/admin-bills.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  billItemTypeSchema,
  createBillSchema,
  markShareSchema,
  updateBillSchema,
  type CreateBillInput,
  type MarkShareInput,
  type UpdateBillInput,
} from '@maoleaw/shared';
import { BillsService } from './bills.service';

const previewSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(z.object({ price: z.number().int().nonnegative(), itemType: billItemTypeSchema })),
});

const bulkMarkSchema = z.object({
  shareIds: z.array(z.string().uuid()).min(1),
  paymentStatus: z.enum(['PENDING', 'CLAIMED', 'PAID']),
});
type BulkMarkInput = z.infer<typeof bulkMarkSchema>;

@Controller('/admin/bills')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminBillsController {
  constructor(private readonly bills: BillsService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.bills.listAdmin({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      status,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.getAdminDetail(id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createBillSchema)) body: CreateBillInput,
  ) {
    return this.bills.create(user.sub, body);
  }

  @Post('/calculate-preview')
  @HttpCode(200)
  preview(@Body(new ZodValidationPipe(previewSchema)) body: z.infer<typeof previewSchema>) {
    return this.bills.calculatePreview(body.eventId, body.items);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBillSchema)) body: UpdateBillInput,
  ) {
    return this.bills.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.delete(id);
  }

  @Post(':id/send')
  @HttpCode(200)
  send(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.send(id);
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.close(id);
  }

  @Post(':id/reset-to-draft')
  @HttpCode(200)
  resetToDraft(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.resetToDraft(id);
  }

  @Patch(':id/shares/:shareId')
  markShare(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @Body(new ZodValidationPipe(markShareSchema)) body: MarkShareInput,
  ) {
    return this.bills.markShare(shareId, body.paymentStatus);
  }

  @Post(':id/shares/bulk-mark')
  @HttpCode(200)
  bulkMark(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(bulkMarkSchema)) body: BulkMarkInput,
  ) {
    return this.bills.bulkMarkShares(id, body.shareIds, body.paymentStatus);
  }

  @Post(':id/shares/:shareId/retry-push')
  @HttpCode(200)
  retryPush(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('shareId', ParseUUIDPipe) shareId: string,
  ) {
    return this.bills.retryPush(id, shareId).then((ok) => ({ ok }));
  }
}
