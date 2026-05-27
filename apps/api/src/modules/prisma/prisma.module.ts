// File: apps/api/src/modules/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { prisma } from '@maoleaw/db';

export const PRISMA = Symbol('PRISMA');

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }],
  exports: [PRISMA],
})
export class PrismaModule {}
