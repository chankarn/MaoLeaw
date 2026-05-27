// File: apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { EventsModule } from './modules/events/events.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { BillsModule } from './modules/bills/bills.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AdminSettingsModule } from './modules/admin-settings/admin-settings.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { configValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: (raw) => configValidationSchema.parse(raw),
    }),
    ThrottlerModule.forRoot(
      process.env.E2E_TEST_MODE === 'true'
        ? [
            // Effectively disabled for E2E so test bursts don't trip 429.
            { name: 'short', ttl: 1000, limit: 100_000 },
            { name: 'medium', ttl: 60_000, limit: 1_000_000 },
          ]
        : [
            { name: 'short', ttl: 1000, limit: 10 },
            { name: 'medium', ttl: 60_000, limit: 60 },
          ],
    ),
    PrismaModule,
    AuthModule,
    MembersModule,
    EventsModule,
    SubmissionsModule,
    BillsModule,
    AdminDashboardModule,
    AdminSettingsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
