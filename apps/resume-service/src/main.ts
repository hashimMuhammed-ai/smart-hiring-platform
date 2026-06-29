import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module.js';

const PORT = parseInt(process.env.RESUME_SERVICE_PORT ?? '3001', 10);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: PORT,
    },
  });

  await app.listen();
  Logger.log(`🚀 Resume Service listening on TCP port ${PORT}`);
}

bootstrap();
