import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminReceiptsController } from './receipts.controller';
import { ReceiptReaderService } from './receipt-reader.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminReceiptsController],
  providers: [ReceiptReaderService],
})
export class ReceiptsModule {}
