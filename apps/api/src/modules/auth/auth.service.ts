// File: apps/api/src/modules/auth/auth.service.ts
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { prisma } from '@maoleaw/db';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import type {
  AdminAuthResponse,
  AdminLoginInput,
  LineAuthInput,
  LineAuthResponse,
  MemberDto,
} from '@maoleaw/shared';
import { LineService } from './line.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly line: LineService,
  ) {}

  async authenticateLine(input: LineAuthInput): Promise<LineAuthResponse> {
    const profile = await this.line.verifyIdToken(input.idToken);

    // Upsert member with fresh LINE profile fields.
    const existing = await prisma.member.findUnique({ where: { lineUserId: profile.userId } });

    let member;
    if (existing) {
      if (existing.banned) {
        throw new ForbiddenException('Banned');
      }
      member = await prisma.member.update({
        where: { id: existing.id },
        data: {
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl ?? null,
        },
      });
    } else {
      // First-time visit — create a "pending registration" placeholder so we can attach a JWT.
      // We mark unregistered by setting customName === '' (FE redirects to /register).
      member = await prisma.member.create({
        data: {
          lineUserId: profile.userId,
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl ?? null,
          customName: '',
          preferredDrink: 'LIQUOR',
          memberType: 'OTHER',
        },
      });
    }

    const payload: JwtPayload = { sub: member.id, role: 'MEMBER', lineUserId: member.lineUserId };
    const token = await this.jwt.signAsync(payload);
    const decoded = this.jwt.decode<{ exp: number }>(token);

    const dto: MemberDto = {
      id: member.id,
      lineUserId: member.lineUserId,
      displayName: member.lineDisplayName,
      pictureUrl: member.linePictureUrl,
      customName: member.customName,
      preferredDrink: member.preferredDrink,
      memberType: member.memberType,
      isRegistered: member.customName.length > 0,
    };

    return {
      token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      member: dto,
    };
  }

  async loginAdmin(input: AdminLoginInput): Promise<AdminAuthResponse> {
    const admin = await prisma.adminUser.findUnique({ where: { email: input.email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = { sub: admin.id, role: 'ADMIN', email: admin.email };
    const token = await this.jwt.signAsync(payload);
    const decoded = this.jwt.decode<{ exp: number }>(token);

    return {
      token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }
}
