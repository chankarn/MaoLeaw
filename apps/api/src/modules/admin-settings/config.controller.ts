import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminSettingsService } from './admin-settings.service';

/** Read-only app config for LIFF (admin-edited member type labels). */
@Controller('/config')
@UseGuards(JwtAuthGuard)
@Roles('MEMBER', 'ADMIN')
export class ConfigController {
  constructor(private readonly svc: AdminSettingsService) {}

  @Get()
  get() {
    return this.svc.getConfig();
  }
}
