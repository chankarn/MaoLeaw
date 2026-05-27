// File: apps/api/src/modules/members/members.controller.ts
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { registerMemberSchema, updateMemberSchema, type RegisterMemberInput, type UpdateMemberInput } from '@maoleaw/shared';
import { MembersService } from './members.service';

@Controller('/members')
@UseGuards(JwtAuthGuard)
@Roles('MEMBER')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get('/me')
  me(@CurrentUser() user: JwtPayload) {
    return this.members.getById(user.sub);
  }

  @Post('/register')
  register(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(registerMemberSchema)) body: RegisterMemberInput,
  ) {
    return this.members.register(user.sub, body);
  }

  @Patch('/me')
  update(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateMemberSchema)) body: UpdateMemberInput,
  ) {
    return this.members.update(user.sub, body);
  }
}
