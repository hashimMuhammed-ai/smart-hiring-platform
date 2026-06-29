# Coding Standards — Smart Hiring Platform
 
These standards must be followed in every file the IDE generates or modifies. When in doubt, match the patterns already established in the codebase rather than introducing new ones.
 
## TypeScript
 
- Strict mode enabled: `"strict": true` in all tsconfig files
- No `any` — use `unknown` and narrow, or define a proper type
- Prefer `interface` for object shapes that describe a contract; `type` for unions, intersections, and aliases
- All async functions must be explicitly typed with their return type: `async function foo(): Promise<Bar>`
- Never use non-null assertion (`!`) — use optional chaining or proper null checks
## NestJS conventions
 
### Module structure
 
Every NestJS module follows this file layout:
```
feature/
  feature.module.ts
  feature.controller.ts   (API Gateway only — microservices have no controllers)
  feature.service.ts
  feature.repository.ts   (TypeORM queries live here, not in the service)
  dto/
    create-feature.dto.ts
    update-feature.dto.ts
  handlers/               (CQRS — command and query handlers)
    commands/
      create-feature.command.ts
      create-feature.handler.ts
    queries/
      get-feature.query.ts
      get-feature.handler.ts
```
 
### CQRS
 
All write operations use CQRS with `@nestjs/cqrs`. Every state-changing action is a `Command`; every read is a `Query`. Services dispatch commands/queries — they do not contain business logic directly.
 
```typescript
// DO: dispatch a command
async createJob(dto: CreateJobDto, tenantId: string): Promise<Job> {
  return this.commandBus.execute(new CreateJobCommand(dto, tenantId))
}
 
// DO NOT: put business logic in the service method
async createJob(dto: CreateJobDto): Promise<Job> {
  const job = this.jobRepo.create(dto)  // wrong — logic belongs in handler
  return this.jobRepo.save(job)
}
```
 
### DTOs
 
- All DTOs use `class-validator` decorators
- Every DTO property must be decorated with at minimum `@IsString()`, `@IsUUID()`, etc.
- Use `@Transform` for sanitisation (trim strings, lowercase emails)
- Export DTOs from `libs/shared/dto/` so they are reusable across services
### Microservice message handlers
 
```typescript
@MessagePattern('resume.upload')
async handleResumeUpload(
  @Payload() payload: ResumeUploadPayload,
): Promise<{ data: ResumeUploadResult | null; error: string | null }> {
  try {
    const data = await this.resumeService.queueParse(payload)
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}
```
 
Always wrap TCP handlers in try/catch and return the `{ data, error }` envelope. Never let an exception propagate across the TCP boundary.
 
### Dependency injection
 
- Never instantiate services with `new` — always inject via constructor
- Prefer constructor injection over property injection
- Module providers list must explicitly declare every injectable
## Repository pattern
 
All database access goes through a repository class. Services never call TypeORM methods directly.
 
```typescript
// DO: use a repository method
const candidates = await this.candidateRepo.findByJobId(jobId, tenantId)
 
// DO NOT: call TypeORM directly from a service
const candidates = await this.dataSource.getRepository(Candidate).find({ where: { jobId } })
```
 
Repositories extend a `BaseRepository<T>` that wraps common patterns and enforces `tenantId` on every query.
 
## Multi-tenancy enforcement
 
Every repository method that reads or writes data must accept and apply `tenantId`. The `BaseRepository` enforces this at the type level — methods without `tenantId` will not compile.
 
```typescript
async findByJobId(jobId: string, tenantId: string): Promise<Candidate[]> {
  return this.repo.find({ where: { jobId, tenantId } })  // tenantId always applied
}
```
 
## Error handling
 
- Never throw raw `Error` objects from services — use NestJS built-in exceptions (`NotFoundException`, `BadRequestException`, etc.) in the API Gateway layer
- In microservices, return `{ data: null, error: 'message' }` — let the Gateway convert to HTTP exceptions
- Log errors with Winston at `error` level with structured context: `this.logger.error('message', { error, context: { tenantId, jobId } })`
## LangChain conventions
 
- All LangChain chains live in a dedicated `*-langchain.service.ts` file per service
- Chains are constructed once in `onModuleInit()`, not per-request
- Prompts are stored as string constants in a `prompts/` folder within the service, not inline
- Always parse LangChain LLM output through Zod before returning — never trust raw string output
```typescript
// prompts/resume-extraction.prompt.ts
export const RESUME_EXTRACTION_PROMPT = `
You are an expert resume parser. Extract the following from the resume text and return ONLY valid JSON...
`
```
 
## BullMQ conventions
 
- Queue names are string constants in `libs/shared/constants/queues.ts`
- Job processors are in `processors/` within the service
- Every processor class is decorated with `@Processor(QUEUE_NAME)`
- Processors log job start, completion, and failure with job ID in the context
- Retry config: `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`
## Naming conventions
 
| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `resume-parse.processor.ts` |
| Classes | PascalCase | `ResumeParseProcessor` |
| Interfaces | PascalCase, no `I` prefix | `CandidatePayload` |
| Enums | PascalCase, values SCREAMING_SNAKE | `PipelineStage.SCREENING` |
| Database columns | snake_case | `tenant_id`, `parsed_data` |
| TypeORM entity props | camelCase (mapped from snake_case) | `tenantId`, `parsedData` |
| Queue names | kebab-case | `resume-parse`, `notifications` |
| TCP message patterns | `domain.action` | `resume.upload`, `pipeline.move` |
| Environment variables | SCREAMING_SNAKE_CASE | `REDIS_URL`, `OPENAI_API_KEY` |
 
## Testing expectations
 
- Unit tests for all command/query handlers (mock repositories)
- Integration tests for repository methods (use a test database)
- E2E tests for critical API Gateway routes (auth, job create, upload, match)
- Test files co-located: `feature.handler.spec.ts` beside `feature.handler.ts`
- Use `@nestjs/testing` `TestingModule` — do not use `jest.mock()` on NestJS providers
## Import rules
 
- Always import from barrel files (`index.ts`) in shared libs — never import deeply from another service's internals
- Path aliases are configured in the Nx `tsconfig.base.json` — use `@app/shared/dto` not `../../libs/shared/dto`
- Never import from one microservice into another — shared code lives in `libs/` only