// File: apps/api/src/modules/admin-settings/admin-settings.controller.ts
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminSettingsService } from './admin-settings.service';

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10),
});

const updateConfigSchema = z.object({
  memberTypeLabels: z.record(z.string(), z.string().min(1).max(50)).nullable().optional(),
});

@Controller('/admin/settings')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminSettingsController {
  constructor(private readonly svc: AdminSettingsService) {}

  @Get('/me')
  me(@CurrentUser() user: JwtPayload) {
    return this.svc.getMe(user.sub);
  }

  @Patch('/me')
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateMeSchema)) body: z.infer<typeof updateMeSchema>,
  ) {
    return this.svc.updateMe(user.sub, body);
  }

  @Post('/change-password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: z.infer<typeof changePasswordSchema>,
  ) {
    return this.svc.changePassword(user.sub, body.currentPassword, body.newPassword);
  }

  @Get('/config')
  getConfig() {
    return this.svc.getConfig();
  }

  @Patch('/config')
  updateConfig(@Body(new ZodValidationPipe(updateConfigSchema)) body: z.infer<typeof updateConfigSchema>) {
    return this.svc.updateConfig(body);
  }
}
