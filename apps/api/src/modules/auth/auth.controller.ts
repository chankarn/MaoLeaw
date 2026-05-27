// File: apps/api/src/modules/auth/auth.controller.ts
import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { adminLoginSchema, lineAuthSchema, type AdminLoginInput, type LineAuthInput } from '@maoleaw/shared';
import { AuthService } from './auth.service';

@Controller('/auth')
@Throttle({
  short:
    process.env.E2E_TEST_MODE === 'true'
      ? { limit: 100_000, ttl: 60_000 }
      : { limit: 10, ttl: 60_000 },
})
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/line')
  async line(@Body(new ZodValidationPipe(lineAuthSchema)) body: LineAuthInput) {
    return this.auth.authenticateLine(body);
  }

  @Post('/admin/login')
  async adminLogin(
    @Body(new ZodValidationPipe(adminLoginSchema)) body: AdminLoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.loginAdmin(body);
    res.cookie('session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return result;
  }

  @Post('/admin/logout')
  @HttpCode(204)
  adminLogout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('session', { path: '/' });
  }
}
