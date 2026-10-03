import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillsModule } from '../bills/bills.module';
import { EventsModule } from '../events/events.module';
import { AdminLineController, LineWebhookController } from './line-webhook.controller';
import { LineWebhookService } from './line-webhook.service';

@Module({
  imports: [AuthModule, BillsModule, EventsModule],
  controllers: [LineWebhookController, AdminLineController],
  providers: [LineWebhookService],
})
export class LineWebhookModule {}
