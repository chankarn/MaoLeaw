// File: apps/api/src/modules/bills/bills.module.ts
import { Module } from '@nestjs/common';
import { BillsController, MyBillsController } from './bills.controller';
import { AdminBillsController } from './admin-bills.controller';
import { BillsService } from './bills.service';
import { BillPushService } from './bill-push.service';
import { AutoRemindService } from './auto-remind.service';
import { AuthModule } from '../auth/auth.module';
import { SlipsModule } from '../slips/slips.module';

@Module({
  imports: [AuthModule, SlipsModule],
  controllers: [BillsController, MyBillsController, AdminBillsController],
  providers: [BillsService, BillPushService, AutoRemindService],
  exports: [BillsService],
})
export class BillsModule {}
