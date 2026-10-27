// File: apps/api/src/modules/admin-settings/admin-settings.module.ts
import { Module } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminSettingsController, ExportController],
  providers: [AdminSettingsService, ExportService],
})
export class AdminSettingsModule {}
