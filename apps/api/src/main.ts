// File: apps/api/src/main.ts
import 'reflect-metadata';
// Load .env BEFORE AppModule so module-level conditionals (e.g. throttler) read correct values.
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '../../../.env') });
loadEnv({ path: path.resolve(__dirname, '../.env'), override: false });

import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix('v1');
  app.use(helmet());
  app.use(cookieParser(process.env.JWT_SECRET));

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}/v1`);
}

bootstrap();
