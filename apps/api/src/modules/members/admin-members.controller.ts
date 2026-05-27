// File: apps/api/src/modules/members/admin-members.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { banMemberSchema, type BanMemberInput } from '@maoleaw/shared';
import { MembersService } from './members.service';

@Controller('/admin/members')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminMembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('banned') banned?: string,
  ) {
    return this.members.listAdmin({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      search,
      type,
      banned: banned === undefined ? undefined : banned === 'true',
    });
  }

  @Post(':id/ban')
  ban(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(banMemberSchema)) body: BanMemberInput,
  ) {
    return this.members.setBanned(id, body.banned);
  }
}
