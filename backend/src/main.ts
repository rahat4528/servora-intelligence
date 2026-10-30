import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './common/logging/structured-logger.service';

async function bootstrap() {
  const logger = new StructuredLoggerService();
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Enable CORS
  const frontendUrl = process.env.SERVORA_FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global API route prefix
  app.setGlobalPrefix('api');

  const port = parseInt(process.env.SERVORA_PORT || '4000', 10);
  await app.listen(port);

  logger.log(
    `========================================================\n` +
    `  SERVORA INTELLIGENCE — BACKEND INITIALIZED\n` +
    `  Status: Operational\n` +
    `  Port: ${port}\n` +
    `  Health Check: http://localhost:${port}/api/health\n` +
    `========================================================`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('[Servora Fatal Error] Application failed to start:', err);
  process.exit(1);
});

