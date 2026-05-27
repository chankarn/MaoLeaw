// File: apps/api/src/modules/admin-settings/admin-settings.service.ts
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@maoleaw/db';
import bcrypt from 'bcrypt';

const SINGLETON_ID = 'singleton';

@Injectable()
export class AdminSettingsService {
  async getMe(adminId: string) {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    };
  }

  async updateMe(adminId: string, input: { name?: string; email?: string }) {
    const admin = await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.email !== undefined && { email: input.email.trim().toLowerCase() }),
      },
    });
    return { id: admin.id, email: admin.email, name: admin.name };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters');
    }
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');
    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password incorrect');

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash: hash } });
    return { ok: true };
  }

  async getConfig() {
    const cfg = await prisma.appConfig.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
    return {
      promptpayIdOverride: cfg.promptpayIdOverride,
      memberTypeLabels: (cfg.memberTypeLabels as Record<string, string> | null) ?? {},
      updatedAt: cfg.updatedAt.toISOString(),
    };
  }

  async updateConfig(input: {
    promptpayIdOverride?: string | null;
    memberTypeLabels?: Record<string, string> | null;
  }) {
    const cfg = await prisma.appConfig.upsert({
      where: { id: SINGLETON_ID },
      update: {
        ...(input.promptpayIdOverride !== undefined && {
          promptpayIdOverride: input.promptpayIdOverride,
        }),
        ...(input.memberTypeLabels !== undefined && {
          memberTypeLabels: input.memberTypeLabels ?? undefined,
        }),
      },
      create: {
        id: SINGLETON_ID,
        promptpayIdOverride: input.promptpayIdOverride ?? null,
        memberTypeLabels: input.memberTypeLabels ?? undefined,
      },
    });
    return {
      promptpayIdOverride: cfg.promptpayIdOverride,
      memberTypeLabels: (cfg.memberTypeLabels as Record<string, string> | null) ?? {},
      updatedAt: cfg.updatedAt.toISOString(),
    };
  }
}
