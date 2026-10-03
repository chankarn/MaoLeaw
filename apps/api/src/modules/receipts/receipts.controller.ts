import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReceiptReaderService, type ReceiptImage } from './receipt-reader.service';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

@Controller('/admin/receipts')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminReceiptsController {
  constructor(private readonly reader: ReceiptReaderService) {}

  /** multipart/form-data `image` → suggested bill rows. Nothing is stored. */
  @Post('/read')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_RECEIPT_BYTES, files: 1 } }))
  read(@UploadedFile() image: ReceiptImage | undefined) {
    if (!image || !image.mimetype.startsWith('image/')) {
      throw new BadRequestException('กรุณาแนบรูปใบเสร็จ');
    }
    return this.reader.read(image);
  }
}
