// File: apps/api/src/modules/submissions/submissions.module.ts
import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { AdminAttendeesController } from './admin-attendees.controller';
import { SubmissionsService } from './submissions.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SubmissionsController, AdminAttendeesController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
