// File: apps/api/src/modules/members/members.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@maoleaw/db';
import type { DrinkPreference, MemberDto, MemberType, RegisterMemberInput, UpdateMemberInput } from '@maoleaw/shared';

@Injectable()
export class MembersService {
  async getById(memberId: string): Promise<MemberDto> {
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m) throw new NotFoundException('Member not found');
    return this.toDto(m);
  }

  async register(memberId: string, input: RegisterMemberInput): Promise<MemberDto> {
    const m = await prisma.member.update({
      where: { id: memberId },
      data: {
        customName: input.customName,
        preferredDrink: input.preferredDrink,
        memberType: input.memberType,
      },
    });
    return this.toDto(m);
  }

  async update(memberId: string, input: UpdateMemberInput): Promise<MemberDto> {
    const m = await prisma.member.update({
      where: { id: memberId },
      data: input,
    });
    return this.toDto(m);
  }

  async listAdmin(opts: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    banned?: boolean;
  }) {
    const where = {
      ...(opts.search && {
        OR: [
          { customName: { contains: opts.search, mode: 'insensitive' as const } },
          { lineDisplayName: { contains: opts.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(opts.type && { memberType: opts.type as never }),
      ...(opts.banned !== undefined && { banned: opts.banned }),
    };

    const [items, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: { _count: { select: { submissions: true } } },
      }),
      prisma.member.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        ...this.toDto(m),
        banned: m.banned,
        createdAt: m.createdAt.toISOString(),
        totalEvents: m._count.submissions,
      })),
      page: opts.page,
      limit: opts.limit,
      total,
    };
  }

  async setBanned(memberId: string, banned: boolean) {
    return prisma.member.update({ where: { id: memberId }, data: { banned } });
  }

  private toDto(m: {
    id: string;
    lineUserId: string;
    lineDisplayName: string;
    linePictureUrl: string | null;
    customName: string;
    preferredDrink: DrinkPreference;
    memberType: MemberType;
  }): MemberDto {
    return {
      id: m.id,
      lineUserId: m.lineUserId,
      displayName: m.lineDisplayName,
      pictureUrl: m.linePictureUrl,
      customName: m.customName,
      preferredDrink: m.preferredDrink,
      memberType: m.memberType,
      isRegistered: m.customName.length > 0,
    };
  }
}
