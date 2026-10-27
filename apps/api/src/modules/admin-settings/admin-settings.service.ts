// File: apps/api/src/modules/admin-settings/admin-settings.service.ts
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@maoleaw/db';
import bcrypt from 'bcrypt';

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
      throw new BadRequestException('รหัสผ่านต้องยาวอย่างน้อย 10 ตัว');
    }
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');
    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('รหัสผ่านปัจจุบันไม่ถูกต้อง');

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash: hash } });
    return { ok: true };
  }

}
