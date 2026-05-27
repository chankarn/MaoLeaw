// File: apps/api/src/modules/admin-dashboard/admin-dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

const VALID_RANGES = ['today', 'week', 'month', '3months', 'all'] as const;
type Range = (typeof VALID_RANGES)[number];

@Controller('/admin/dashboard')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get()
  overview(@Query('range') range?: string) {
    const r: Range = (VALID_RANGES as readonly string[]).includes(range ?? '')
      ? (range as Range)
      : 'month';
    return this.dashboard.getOverview(r);
  }
}
