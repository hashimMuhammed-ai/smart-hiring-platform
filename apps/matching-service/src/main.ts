import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module.js';

const PORT = parseInt(process.env.MATCHING_SERVICE_PORT ?? '3002', 10);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: PORT,
    },
  });

  await app.listen();
  Logger.log(`🚀 Matching Service listening on TCP port ${PORT}`);
}

bootstrap();
