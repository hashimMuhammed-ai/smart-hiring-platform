# Architecture — Smart Hiring Platform
 
## Style
 
Microservices architecture using NestJS. All services live in the same Nx monorepo. Inter-service communication uses NestJS TCP transport (`@nestjs/microservices`). The API Gateway is the only HTTP-facing service; all others expose only TCP.
 
## Services
 
### API Gateway (`apps/api-gateway`)
 
- NestJS HTTP application running on port 3000
- Handles: JWT authentication, request validation, rate limiting, CORS
- Uses `ClientProxy` to communicate with each microservice over TCP
- Does NOT contain business logic — only routing, auth guards, and DTO validation
- Swagger docs auto-generated at `/api/docs`
### Resume Service (`apps/resume-service`)
 
- NestJS microservice on TCP port 3001
- Responsibilities:
  - Accept resume upload events from API Gateway
  - Enqueue `resume-parse` BullMQ jobs
  - Job processor: download PDF from R2, run LangChain extraction, save candidate + embedding
- Owns: `Candidate` entity, `ResumeEmbedding` storage in pgvector
- LangChain usage: `PDFLoader → RecursiveCharacterTextSplitter → LLMChain` with structured output prompt
### Matching Service (`apps/matching-service`)
 
- NestJS microservice on TCP port 3002
- Responsibilities:
  - Embed job descriptions on creation/update
  - Run similarity search against candidate embeddings in pgvector
  - Score top candidates using LangChain `RetrievalQAChain`
  - Persist scores to `candidate_job_matches` table
- LangChain usage: `OpenAIEmbeddings → PGVectorStore.similaritySearchWithScore() → LLMChain` scoring chain
### Pipeline Service (`apps/pipeline-service`)
 
- NestJS microservice on TCP port 3003
- Responsibilities:
  - CRUD for pipeline stages per job
  - Move candidates between stages, enforce valid transitions
  - Log stage change history with timestamps and notes
  - Publish `candidate.stage.changed` event to BullMQ after each transition
- Owns: `PipelineStage`, `StageHistory` entities
### Notification Service (`apps/notification-service`)
 
- NestJS microservice on TCP port 3004
- Responsibilities:
  - Consume `candidate.stage.changed` events from BullMQ
  - Send stage-appropriate email via Nodemailer
  - Log email delivery status
- No TCP exposure — pure queue consumer
## Communication patterns
 
```
Next.js Frontend
      │  HTTP/REST
      ▼
API Gateway (HTTP :3000)
      │  NestJS TCP ClientProxy
      ├──────────────────────────► Resume Service (:3001)
      ├──────────────────────────► Matching Service (:3002)
      └──────────────────────────► Pipeline Service (:3003)
 
Resume Service ──► BullMQ queue: resume-parse ──► Resume Service (job processor)
Pipeline Service ──► BullMQ queue: notifications ──► Notification Service (consumer)
```
 
## Data flow: resume upload
 
1. `POST /api/resumes` → API Gateway validates JWT, forwards to Resume Service via TCP
2. Resume Service stores PDF to Cloudflare R2, creates a pending `Candidate` row, enqueues BullMQ job
3. Job processor wakes up, downloads PDF, runs LangChain extraction
4. Structured candidate data saved to PostgreSQL; embedding saved to pgvector
5. API Gateway returns `{ candidateId, status: 'processing' }` immediately (async — no blocking)
## Data flow: candidate matching
 
1. `POST /api/jobs/:id/match` → API Gateway → Matching Service via TCP
2. Matching Service fetches the job's JD embedding (or re-embeds if stale)
3. pgvector cosine similarity search retrieves top 20 candidate vectors for the tenant
4. LangChain scoring chain sends top candidates + JD to GPT-4o-mini, returns JSON scores
5. Scores persisted to `candidate_job_matches`; ranked list returned to frontend
## Multi-tenancy
 
- Every database entity has a `tenantId` column
- API Gateway extracts `tenantId` from the JWT payload and injects it into every TCP message payload
- Every service query always includes `WHERE tenant_id = $tenantId` — never trust client-supplied tenant IDs
- pgvector similarity searches are always scoped by `tenant_id`
## LangChain architecture
 
```
LangChainModule (shared, injected per service)
  ├── ResumeLangChainService     (Resume Service)
  │     └── PDFResumeChain: PDFLoader → Splitter → LLMChain → structured JSON
  ├── MatchingLangChainService   (Matching Service)
  │     └── CandidateMatchChain: embeddings → pgvector search → scoring LLMChain
  └── CandidateAgentService     (API Gateway — optional v1.1)
        └── Agent with tools: search_candidates, get_pipeline_status
```
 
All LangChain services use:
- `text-embedding-3-small` for embeddings (1536 dimensions, cost-efficient)
- `gpt-4o-mini` for all LLMChain calls (fast, cheap, good enough for scoring)
## Infrastructure
 
### Local (Docker Compose)
 
```yaml
services:
  postgres:     image: pgvector/pgvector:pg16
  redis:        image: redis:7-alpine
  api-gateway:  build from apps/api-gateway
  resume-svc:   build from apps/resume-service
  matching-svc: build from apps/matching-service
  pipeline-svc: build from apps/pipeline-service
  notif-svc:    build from apps/notification-service
  web:          build from apps/web
```
 
### Production
 
- All NestJS services deployed as separate Railway services
- Next.js deployed on Vercel
- Managed PostgreSQL with pgvector extension enabled
- Upstash Redis (TLS, same pattern as AI Research Agent)
- Cloudflare R2 for resume storage
## Error handling strategy
 
- All TCP message handlers return `{ data, error }` envelope — never throw across service boundaries
- API Gateway maps service errors to HTTP status codes
- BullMQ jobs retry 3 times with exponential backoff before moving to dead-letter queue
- Failed parse jobs mark the `Candidate` row status as `parse_failed`
 