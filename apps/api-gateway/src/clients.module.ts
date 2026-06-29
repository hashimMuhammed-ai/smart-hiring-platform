import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * Token constants used to inject the TCP clients in other modules.
 * Import these tokens when using @Inject() in a service.
 */
export const RESUME_SERVICE = 'RESUME_SERVICE';
export const MATCHING_SERVICE = 'MATCHING_SERVICE';
export const PIPELINE_SERVICE = 'PIPELINE_SERVICE';
export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: RESUME_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.RESUME_SERVICE_HOST ?? '127.0.0.1',
          port: parseInt(process.env.RESUME_SERVICE_PORT ?? '3001', 10),
        },
      },
      {
        name: MATCHING_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.MATCHING_SERVICE_HOST ?? '127.0.0.1',
          port: parseInt(process.env.MATCHING_SERVICE_PORT ?? '3002', 10),
        },
      },
      {
        name: PIPELINE_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.PIPELINE_SERVICE_HOST ?? '127.0.0.1',
          port: parseInt(process.env.PIPELINE_SERVICE_PORT ?? '3003', 10),
        },
      },
      {
        name: NOTIFICATION_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.NOTIFICATION_SERVICE_HOST ?? '127.0.0.1',
          port: parseInt(process.env.NOTIFICATION_SERVICE_PORT ?? '3004', 10),
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class ClientsConfigModule {}
