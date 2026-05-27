// File: apps/api/src/common/filters/http-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import type { ProblemDetail } from '@maoleaw/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ZodError) {
      const body: ProblemDetail = {
        type: '/errors/validation',
        title: 'Validation Error',
        status: 400,
        fields: Object.fromEntries(
          exception.issues.map((i) => [i.path.join('.') || '_root', i.message]),
        ),
      };
      response.status(400).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const detail =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message as string) ?? exception.message;

      const body: ProblemDetail = {
        type: `/errors/${exception.name.toLowerCase()}`,
        title: exception.name,
        status,
        detail: Array.isArray(detail) ? detail.join(', ') : detail,
      };
      response.status(status).json(body);
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    const body: ProblemDetail = {
      type: '/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: process.env.NODE_ENV === 'production' ? 'Something went wrong' : String(exception),
    };
    response.status(500).json(body);
  }
}
