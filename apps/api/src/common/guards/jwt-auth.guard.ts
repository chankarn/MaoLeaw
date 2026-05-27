// File: apps/api/src/common/guards/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../decorators/current-user.decorator';
import { prisma } from '@maoleaw/db';

export const ROLES_KEY = 'roles';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing auth token');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (required && required.length > 0 && !required.includes(payload.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    if (payload.role === 'MEMBER') {
      const m = await prisma.member.findUnique({ where: { id: payload.sub }, select: { banned: true } });
      if (!m) throw new UnauthorizedException('Member not found');
      if (m.banned) throw new ForbiddenException('Banned');
    }

    req.user = payload;
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookie = (req as Request & { signedCookies?: Record<string, string>; cookies?: Record<string, string> })
      .signedCookies?.session ?? (req as Request & { cookies?: Record<string, string> }).cookies?.session;
    return cookie ?? null;
  }
}
