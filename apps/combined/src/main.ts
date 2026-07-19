import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { CombinedAppModule } from './combined-app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(CombinedAppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  Logger.log('📦 Connecting modular microservices internally...');

  // Dynamically import service modules to prevent registration overlaps in HTTP app DI context
  const { AppModule: ResumeAppModule } = await import('../../resume-service/src/app/app.module.js');
  const { AppModule: MatchingAppModule } = await import('../../matching-service/src/app/app.module.js');
  const { AppModule: PipelineAppModule } = await import('../../pipeline-service/src/app/app.module.js');
  const { AppModule: NotificationAppModule } = await import('../../notification-service/src/app/app.module.js');

  // Bind microservice handlers to local loopback TCP interfaces with isolated DI contexts (inheritAppConfig: false)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3001,
    },
  }, { inheritAppConfig: false });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3002,
    },
  }, { inheritAppConfig: false });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3003,
    },
  }, { inheritAppConfig: false });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3004,
    },
  }, { inheritAppConfig: false });

  // Start internal microservices in the background
  await app.startAllMicroservices();
  Logger.log('🚀 Microservice TCP listeners online');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Modular Monolith HTTP gateway listening on: http://localhost:${port}/api`);
}

bootstrap();
