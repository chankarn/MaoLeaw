// File: apps/api/src/modules/health/health.controller.ts
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { prisma } from '@maoleaw/db';

@Controller('/health')
export class HealthController {
  @Get()
  @Throttle({ short: { limit: 100, ttl: 60_000 } })
  health() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('/db')
  async db(@Res() res: Response) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({ status: 'ok' });
    } catch (err) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        message: err instanceof Error ? err.message : 'db unreachable',
      });
    }
  }
}
