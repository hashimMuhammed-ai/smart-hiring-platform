import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClientsConfigModule } from '../clients.module.js';
import { R2Module } from '../r2/r2.module.js';
import { CandidatesUploadController } from '../candidates/candidates-upload.controller.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor.js';

@Module({
  imports: [AuthModule, ClientsConfigModule, R2Module],
  controllers: [AppController, CandidatesUploadController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
