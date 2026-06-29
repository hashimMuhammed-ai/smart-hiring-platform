# Task List — Smart Hiring Platform
 
Tasks are written as atomic, implementable units. Each task specifies exactly what file(s) to create/modify and what the acceptance criteria are. Complete tasks in order within each sprint — later tasks depend on earlier ones.
 
---
 
## Sprint 1 — Monorepo, infrastructure, auth
 
### S1-T1: Initialise Nx monorepo
- Run `npx create-nx-workspace@latest smart-hiring --preset=empty`
- Add NestJS plugin: `nx add @nx/nest`
- Add Next.js plugin: `nx add @nx/next`
- Generate 5 NestJS apps: `api-gateway`, `resume-service`, `matching-service`, `pipeline-service`, `notification-service`
- Generate 1 Next.js app: `web`
- Create shared libs: `nx g @nx/js:lib shared/dto`, `shared/types`, `shared/constants`, `shared/database`
- AC: `nx graph` shows all 6 apps and 4 libs with correct dependencies
### S1-T2: Docker Compose for local infrastructure
- Create `docker-compose.yml` at repo root
- Services: `postgres` (image: `pgvector/pgvector:pg16`, port 5432), `redis` (image: `redis:7-alpine`, port 6379)
- Create `docker-compose.full.yml` that adds all 5 NestJS services and the Next.js app (used for integration testing)
- AC: `docker compose up postgres redis` starts both services; `psql` connects
### S1-T3: TypeORM setup and shared database module
- In `libs/shared/database/`: create `database.module.ts` that reads `DATABASE_URL` and configures TypeORM with `synchronize: false`, `autoLoadEntities: true`
- Enable pgvector: add `CREATE EXTENSION IF NOT EXISTS vector` in a migration
- Create `BaseEntity` class with `id: UUID`, `createdAt`, `updatedAt`
- Create `BaseRepository<T>` abstract class with typed `findById(id, tenantId)` and `save()` methods
- AC: `database.module.ts` imports cleanly into any NestJS app; TypeORM connects to local Postgres
### S1-T4: Database migrations — all entities
- Create TypeORM migrations for all tables defined in `database.md` in this order:
  1. `CreateTenantsTable`
  2. `CreateUsersTable`
  3. `CreateJobsTable` (with `vector(1536)` column)
  4. `CreateCandidatesTable` (with `vector(1536)` column)
  5. `CreateCandidateJobMatchesTable`
  6. `CreatePipelineStagesTable`
  7. `CreateStageHistoryTable`
  8. `CreateEmailLogsTable`
- Create all TypeORM entity classes in `libs/shared/database/entities/`
- AC: `typeorm migration:run` completes with no errors; all tables visible in Postgres
### S1-T5: JWT auth in API Gateway
- Install: `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `bcryptjs`
- Create `AuthModule` in `api-gateway` with `register` and `login` endpoints matching `api.md`
- `JwtStrategy` extracts `{ sub, tenantId, role }` from token payload
- `JwtAuthGuard` applied globally; `@Public()` decorator for open endpoints
- `RolesGuard` with `@Roles('admin')` decorator for admin-only routes
- Create `TenantInterceptor` that reads `tenantId` from JWT and attaches to every request
- AC: `POST /api/auth/register` creates a tenant + hashed-password user + returns JWT; `POST /api/auth/login` returns JWT; protected route returns 401 without token
### S1-T6: TCP microservice bootstrap
- Each of the 4 microservices (`resume`, `matching`, `pipeline`, `notification`) must:
  - Have a `main.ts` that creates a NestJS microservice with TCP transport and the correct port from `project_context.md`
  - Export its port as an env variable default
- In `api-gateway`, create `clients.module.ts` that registers `ClientsModule.register()` for all 4 services using `Transport.TCP`
- AC: All 4 microservices start without errors; API Gateway boots and connects to all 4 via TCP
---
 
## Sprint 2 — Resume Service
 
### S2-T1: Cloudflare R2 upload in API Gateway
- Install `@aws-sdk/client-s3`
- Create `R2Module` in `api-gateway` wrapping S3Client configured from `R2_*` env vars
- Create `R2Service` with `upload(file: Express.Multer.File, key: string): Promise<string>` method
- `POST /api/jobs/:jobId/candidates/upload` accepts multipart PDF files (max 5MB, max 20 files)
- For each file: generate a UUID key, upload to R2, then send `resume.upload` TCP message to Resume Service
- AC: PDF uploaded via curl lands in R2 bucket; TCP message is sent with correct payload
### S2-T2: Candidate entity and repository
- Create `CandidateRepository` in `resume-service` extending `BaseRepository<Candidate>`
- Methods: `createPending(payload)`, `updateWithParsedData(id, tenantId, parsedData, embedding)`, `markFailed(id, tenantId)`
- AC: Repository methods execute correct SQL with `tenant_id` scoping
### S2-T3: BullMQ parse queue setup
- Add `QUEUE_RESUME_PARSE = 'resume-parse'` to `libs/shared/constants/queues.ts`
- In `resume-service`: install `bullmq`, `@nestjs/bullmq`; configure `BullModule.forRoot` with Redis URL
- Create `ResumeParseQueue` service that adds jobs with retry config: `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`
- AC: Job appears in Redis when upload TCP message is handled
### S2-T4: Resume extraction LangChain chain
- Create `libs/shared/langchain/` with `langchain.module.ts` exporting OpenAI and embedding models
- In `resume-service`, create `ResumeLangChainService` with method `extractFromPdf(r2Key: string): Promise<ParsedResumeData>`
  - Download PDF buffer from R2
  - Use `PDFLoader` (from `langchain/document_loaders/fs/pdf`) on the buffer
  - Split with `RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 200 })`
  - Pass to `LLMChain` with prompt from `prompts/resume-extraction.prompt.ts`
  - Parse response through Zod schema `ParsedResumeDataSchema`
- AC: Given a real PDF resume, `extractFromPdf` returns valid JSON matching the schema in `database.md`
### S2-T5: Resume parse job processor
- Create `ResumeParseProcessor` in `resume-service/src/processors/`
- Decorated with `@Processor(QUEUE_RESUME_PARSE)`
- `@Process()` method:
  1. Log job start with candidateId
  2. Call `ResumeLangChainService.extractFromPdf(r2Key)`
  3. Generate embedding: `OpenAIEmbeddings.embedQuery(parsedData.summary + parsedData.skills.join(' '))`
  4. Call `CandidateRepository.updateWithParsedData(candidateId, tenantId, parsedData, embedding)`
  5. Log completion
  6. On error: call `CandidateRepository.markFailed(candidateId, tenantId)`, rethrow for BullMQ retry
- AC: After upload, candidate row transitions from `parse_status='pending'` to `'done'` with `parsed_data` populated
### S2-T6: Resume TCP message handler
- Create `ResumeController` in `resume-service` with `@MessagePattern('resume.upload')` handler
- Handler: create pending `Candidate` row, enqueue BullMQ job, return `{ data: { candidateId }, error: null }`
- AC: End-to-end — upload PDF via API Gateway, resume-service creates candidate, processor parses it
---
 
## Sprint 3 — Matching Service
 
### S3-T1: Job embedding on creation
- Create `JobRepository` in `matching-service`
- Create `@MessagePattern('job.embed')` handler in `MatchingController`
- Handler calls `MatchingLangChainService.embedJobDescription(jobId, description, tenantId)`:
  - Generate embedding with `OpenAIEmbeddings.embedQuery(description)`
  - Update `jobs.embedding` column via `JobRepository.updateEmbedding()`
- AC: After `POST /api/jobs`, job row has a non-null `embedding` column in pgvector
### S3-T2: pgvector similarity search
- Create `VectorSearchRepository` in `matching-service`
- Method: `findSimilarCandidates(jobEmbedding: number[], jobId: string, tenantId: string, limit = 20): Promise<CandidateWithSimilarity[]>`
- Executes the raw SQL similarity query from `database.md` using TypeORM `query()`
- AC: Given a job embedding, returns top-N candidates sorted by cosine similarity
### S3-T3: LangChain scoring chain
- Create `MatchingLangChainService` in `matching-service`
- Method: `scoreCandidates(jobDescription: string, candidates: CandidateWithSimilarity[]): Promise<ScoredCandidate[]>`
  - Construct a prompt with the JD and top-N candidate summaries
  - Call `LLMChain` with prompt from `prompts/candidate-scoring.prompt.ts`
  - Parse output through `ScoredCandidateArraySchema` (Zod)
  - Return array of `{ candidateId, score, rationale }`
- Prompt must ask the LLM to return ONLY valid JSON array, no preamble
- AC: Given a JD and 5 candidate summaries, returns valid scored array with scores 0–100
### S3-T4: Match orchestration and persistence
- Create `@MessagePattern('job.match')` handler
- Orchestration:
  1. Fetch job's JD and embedding from `jobs` table
  2. Call `VectorSearchRepository.findSimilarCandidates()`
  3. Call `MatchingLangChainService.scoreCandidates()`
  4. Upsert scores to `candidate_job_matches` (use `INSERT ... ON CONFLICT (job_id, candidate_id) DO UPDATE`)
  5. Return top 20 scored candidates sorted by score DESC
- AC: `POST /api/jobs/:id/match` returns ranked candidates with scores and rationale
---
 
## Sprint 4 — Pipeline Service and Notifications
 
### S4-T1: Pipeline CRUD
- Create `PipelineRepository` with methods: `getBoard(jobId, tenantId)`, `getStage(jobId, candidateId, tenantId)`, `upsertStage(jobId, candidateId, tenantId, stage, notes, movedBy)`
- Create `@MessagePattern('pipeline.board')` handler — returns candidates grouped by stage (see `api.md`)
- AC: `GET /api/jobs/:jobId/pipeline` returns kanban-ready payload
### S4-T2: Stage transition with validation
- Create `@MessagePattern('pipeline.move')` handler
- Valid transitions: `applied → screening → interview → offer → (hired | rejected)`. Any stage → `rejected` is always valid.
- On invalid transition, return `{ data: null, error: 'Invalid stage transition' }`
- On valid transition:
  1. Update `pipeline_stages` row
  2. Insert row into `stage_history`
  3. Enqueue `notifications` BullMQ job with candidate email and stage details
- AC: Valid transitions update DB and enqueue notification; invalid transitions return error without DB write
### S4-T3: Notification queue and email processor
- Add `QUEUE_NOTIFICATIONS = 'notifications'` to constants
- In `notification-service`, create `NotificationProcessor` consuming `notifications` queue
- For each stage, send the appropriate email template:
  - `screening` → "Your application is under review"
  - `interview` → "You've been selected for an interview"
  - `offer` → "We have an offer for you"
  - `hired` → "Welcome to the team!"
  - `rejected` → "Thank you for your interest"
- Use Nodemailer with SMTP config from env
- Log success/failure to `email_logs` table
- AC: Moving a candidate to `interview` triggers an email to the candidate's address within 5 seconds
### S4-T4: Jobs CRUD endpoints
- In API Gateway, create `JobsController` with all endpoints from `api.md`
- `POST /api/jobs` → save job to DB, then send `job.embed` TCP message to Matching Service (fire-and-forget with `emit` not `send`)
- `GET /api/jobs` → query via Pipeline Service or direct DB access — choose direct DB read for simplicity here
- `GET /api/jobs/:id` → include candidate count and stage breakdown
- AC: All job endpoints return correct shapes matching `api.md`
---
 
## Sprint 5 — Next.js Frontend
 
### S5-T1: Auth pages and global layout
- Create `/login` and `/register` pages with React Hook Form + Zod validation
- Implement Zustand `AuthStore` with `token`, `user`, `setAuth`, `logout`
- Create `DashboardLayout` with sidebar (jobs list, settings link, logout), wrapped in auth guard that redirects to `/login` if no token
- AC: Login → redirects to dashboard; direct navigation to `/` without token → redirects to `/login`
### S5-T2: Jobs list and create
- `GET /api/jobs` displayed as a table with TanStack Query
- "New job" button opens `/jobs/new` with title + description form
- Submit creates job via `POST /api/jobs`, redirects to `/jobs/[jobId]`
- AC: Can create a job and see it in the list
### S5-T3: Resume upload page
- Implement `ResumeDropzone` with react-dropzone (PDF only, 5MB limit, multi-file)
- On drop: upload all files via `POST /api/jobs/:jobId/candidates/upload`
- Show per-file upload status; on success, start polling `GET /api/jobs/:jobId/candidates` every 3 seconds until all `parseStatus === 'done'`
- AC: Drop 3 PDFs → all show "processing" → poll → all show "done" with extracted name/email
### S5-T4: Candidate list with match scores
- `GET /api/jobs/:jobId/candidates` rendered as table
- Columns: name, email, experience years, skills (pill list, max 5), match score badge, current stage
- "Run AI match" button → `POST /api/jobs/:jobId/match` → loading state → refetch candidates
- Row click → `CandidateSlideOver` panel with full `parsed_data` and stage history
- AC: After running match, score badges appear for all candidates
### S5-T5: Pipeline kanban board
- `GET /api/jobs/:jobId/pipeline` rendered as 6-column kanban
- Each card: candidate name, match score badge
- Drag card between columns using `@dnd-kit/core` → `PATCH /api/pipeline/:candidateId/stage` with optimistic update
- On API error: revert card to original column, show toast error
- AC: Drag candidate to "interview" → DB updates → notification email sent
### S5-T6: Dashboard and polish
- Dashboard page: stats cards (open jobs, candidates this week, interviews in progress)
- Empty states on all list pages with actionable CTAs
- Toast notifications for all async actions (upload queued, match complete, stage moved)
- Mobile-responsive layout (sidebar collapses to hamburger menu)
- README with architecture diagram, setup instructions, and demo GIF
- AC: Project is demo-ready; README shows all major features
---
 
## Stretch goals (post-v1)
 
### SG-T1: Candidate Q&A Agent
- LangChain agent in API Gateway with two tools:
  - `search_candidates`: pgvector similarity search
  - `get_pipeline_status`: SQL query on `pipeline_stages`
- `POST /api/agent/ask` endpoint: `{ question: string }` → `{ answer: string }`
- SSE streaming response for real-time answer display
- Frontend: chat widget in the sidebar
### SG-T2: Bull Board dashboard
- Mount `@bull-board/nestjs` in API Gateway at `/admin/queues`
- Requires admin role JWT
- Shows `resume-parse` and `notifications` queue stats, failed jobs, retry controls
 