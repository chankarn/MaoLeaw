// File: apps/api/src/modules/bills/bills.module.ts
import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { AdminBillsController } from './admin-bills.controller';
import { BillsService } from './bills.service';
import { BillPushService } from './bill-push.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BillsController, AdminBillsController],
  providers: [BillsService, BillPushService],
})
export class BillsModule {}
