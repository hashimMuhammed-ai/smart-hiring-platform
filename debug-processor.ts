import { NestFactory } from '@nestjs/core';
import { AppModule } from './apps/resume-service/src/app/app.module';
import { ResumeParseProcessor } from './apps/resume-service/src/processors/resume-parse.processor';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const processor = app.get(ResumeParseProcessor);
  
  const mockJob: any = {
    id: 'test-job-id',
    data: {
      tenantId: 'a0afd588-0634-4823-9321-e141e34f6f18',
      jobId: '06fc4f59-2f24-4534-a8a5-2e4b65344f08',
      candidateId: '6db911e7-88dc-4e87-aae5-aed3d71df631',
      r2Key: 'tenants/a0afd588-0634-4823-9321-e141e34f6f18/jobs/06fc4f59-2f24-4534-a8a5-2e4b65344f08/resumes/6db911e7-88dc-4e87-aae5-aed3d71df631.pdf',
    }
  };

  try {
    console.log('Running process on mock job...');
    await processor.process(mockJob);
    console.log('PROCESS COMPLETED SUCCESS!');
  } catch (err) {
    console.error('PROCESS FAILED WITH ERROR:', err);
  } finally {
    await app.close();
  }
}

main();
