import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);

  const apiPrefix = config.get<string>('API_PREFIX', '/api/v1');
  // strip leading slash for setGlobalPrefix
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''));

  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(config.get<string>('PORT', '3001'));
  await app.listen(port);
  logger.log(`Katet CRM API listening on http://localhost:${port}${apiPrefix}`);
}

bootstrap();
