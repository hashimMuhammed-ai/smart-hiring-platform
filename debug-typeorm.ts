import { NestFactory } from '@nestjs/core';
import { AppModule } from './apps/resume-service/src/app/app.module';
import { CandidateRepository } from './apps/resume-service/src/resume/candidate.repository';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get(CandidateRepository);

  const dummyVector = '[' + Array(1536).fill(0.1).join(',') + ']';

  try {
    console.log('Testing TypeORM update...');
    await repo.updateWithParsedData(
      '6db911e7-88dc-4e87-aae5-aed3d71df631',
      'a0afd588-0634-4823-9321-e141e34f6f18',
      {
        name: 'HASHIM MUHAMMED',
        email: 'hashim.muhammed.213@gmail.com',
        phone: '9544154220',
        summary: 'Test summary',
        skills: ['React'],
        experience: [],
        education: [],
        total_experience_years: 1,
      },
      dummyVector
    );
    console.log('TYPEORM UPDATE SUCCESSFUL!');
  } catch (err) {
    console.error('TYPEORM UPDATE FAILED WITH ERROR:', err);
  } finally {
    await app.close();
  }
}

main();
