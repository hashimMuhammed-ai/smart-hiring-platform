import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../api-gateway/src/auth/auth.module.js';
import { JobsModule } from '../../api-gateway/src/jobs/jobs.module.js';
import { ClientsConfigModule } from '../../api-gateway/src/clients.module.js';
import { R2Module } from '../../api-gateway/src/r2/r2.module.js';
import { CandidatesUploadController } from '../../api-gateway/src/candidates/candidates-upload.controller.js';
import { CandidatesController } from '../../api-gateway/src/candidates/candidates.controller.js';
import { PipelineModule as GatewayPipelineModule } from '../../api-gateway/src/pipeline/pipeline.module.js';
import { ResumeModule } from '../../resume-service/src/resume/resume.module.js';
import { MatchingModule } from '../../matching-service/src/matching/matching.module.js';
import { PipelineModule as PipelineServiceModule } from '../../pipeline-service/src/pipeline/pipeline.module.js';
import { NotificationModule } from '../../notification-service/src/notification/notification.module.js';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from '../../api-gateway/src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../api-gateway/src/common/guards/roles.guard.js';
import { TenantInterceptor } from '../../api-gateway/src/common/interceptors/tenant.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ClientsConfigModule,
    R2Module,
    GatewayPipelineModule,
    JobsModule,
    ResumeModule,
    MatchingModule,
    PipelineServiceModule,
    NotificationModule,
  ],
  controllers: [CandidatesUploadController, CandidatesController],
  providers: [
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
export class CombinedAppModule {}
