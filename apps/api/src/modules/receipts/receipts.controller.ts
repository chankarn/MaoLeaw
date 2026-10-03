import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReceiptReaderService, type ReceiptImage } from './receipt-reader.service';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
/** Photos per read — enough for a night's receipts; click again for more. */
const MAX_RECEIPT_IMAGES = 5;

@Controller('/admin/receipts')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminReceiptsController {
  constructor(private readonly reader: ReceiptReaderService) {}

  /** multipart/form-data `images` (1–5 photos) → suggested bill rows. Nothing is stored. */
  @Post('/read')
  @HttpCode(200)
  @UseInterceptors(
    FilesInterceptor('images', MAX_RECEIPT_IMAGES, {
      limits: { fileSize: MAX_RECEIPT_BYTES, files: MAX_RECEIPT_IMAGES },
    }),
  )
  read(@UploadedFiles() images: ReceiptImage[] | undefined) {
    if (!images?.length) throw new BadRequestException('กรุณาแนบรูปใบเสร็จ');
    if (images.some((i) => !i.mimetype.startsWith('image/'))) {
      throw new BadRequestException('แนบได้เฉพาะไฟล์รูป');
    }
    return this.reader.read(images);
  }
}
