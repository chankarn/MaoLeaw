// File: apps/api/src/modules/admin-settings/export.controller.ts
import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExportService } from './export.service';

@Controller('/admin/export')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class ExportController {
  constructor(private readonly svc: ExportService) {}

  @Get('/events.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="maoleaw-events.csv"')
  events() {
    return this.svc.eventsCsv();
  }

  @Get('/bills.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="maoleaw-bills.csv"')
  bills() {
    return this.svc.billsCsv();
  }

  @Get('/members.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="maoleaw-members.csv"')
  members() {
    return this.svc.membersCsv();
  }

  @Get('/shares.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="maoleaw-shares.csv"')
  shares() {
    return this.svc.sharesCsv();
  }
}
