# Tech Decisions (ADRs) — Smart Hiring Platform
 
Architecture Decision Records. Each entry explains what was chosen and why, so the IDE and future contributors don't second-guess or reverse these decisions mid-build.
 
---
 
## ADR-001: NestJS TCP transport for inter-service communication
 
**Decision:** Use NestJS built-in TCP transport (`@nestjs/microservices`) for all inter-service calls.
 
**Why not REST between services?** REST adds HTTP overhead and makes it tempting to expose services publicly. TCP keeps communication internal, faster, and framework-native.
 
**Why not Kafka or RabbitMQ for all communication?** The request volume for this project doesn't justify the operational overhead of a full message broker. BullMQ over Redis handles our async needs (resume parsing, notifications). TCP handles synchronous request/response. Both are simple to operate.
 
**Why not gRPC?** Protobuf setup adds complexity with minimal benefit at our scale. NestJS TCP achieves the same internal-only pattern with zero additional tooling.
 
---
 
## ADR-002: PostgreSQL + pgvector instead of a dedicated vector database
 
**Decision:** Store embeddings in PostgreSQL using the `pgvector` extension rather than Pinecone, Weaviate, or Chroma.
 
**Why:** We already need PostgreSQL for relational data (users, jobs, pipeline). Adding a second database for vectors would mean cross-database joins, two connection pools, two infrastructure components to manage, and two failure surfaces. pgvector with HNSW indexes is fast enough for our expected dataset size (<100k candidates per tenant). If we hit scale limits later, migrating to a dedicated vector DB is a clear future upgrade path.
 
---
 
## ADR-003: BullMQ over Redis for async jobs
 
**Decision:** Use BullMQ (backed by Redis) for the resume parsing queue and notification queue.
 
**Why BullMQ and not SQS or a cron job?** BullMQ is already part of the NestJS ecosystem (used in TaxAI and AI Research Agent), provides retry logic with exponential backoff out of the box, has a good dashboard (Bull Board), and runs locally with zero external dependencies beyond Redis.
 
---
 
## ADR-004: LangChain.js over direct OpenAI SDK calls
 
**Decision:** Use LangChain.js chains and tools rather than calling the OpenAI SDK directly.
 
**Why:** LangChain provides: (1) the `PDFLoader` and `TextSplitter` we need for resume parsing, (2) `PGVectorStore` integration that handles embedding + retrieval in one abstraction, (3) a chain composition model that makes the matching logic readable and testable. The trade-off is abstraction overhead, but the DX benefit is worth it at this scale.
 
**Caveat:** Do not use LangChain memory features for stateless API endpoints — only use them for the optional Candidate Q&A Agent (future feature).
 
---
 
## ADR-005: Cloudflare R2 for resume storage
 
**Decision:** Store uploaded resume PDFs in Cloudflare R2, not on local disk or in the database.
 
**Why not the database?** Binary blobs in PostgreSQL inflate backup sizes and slow down all queries.
 
**Why R2 over S3?** R2 has no egress fees. The API is S3-compatible, so the `@aws-sdk/client-s3` library works with zero changes. Given our Kerala/India-based user, R2's cost structure is better for a portfolio project with real traffic.
 
---
 
## ADR-006: Nx monorepo
 
**Decision:** All services and the frontend live in a single Nx monorepo.
 
**Why:** Shared code (`libs/shared/`) can be imported across services without publishing packages. TypeScript path aliases work out of the box. A single `docker-compose.yml` covers the full local dev environment. This matches the TaxAI project structure the developer already knows.
 
**Trade-off:** Nx build caching is useful but requires understanding Nx project configuration. The `project.json` in each app must be correct for builds to work.
 
---
 
## ADR-007: gpt-4o-mini for all LLM calls
 
**Decision:** Use `gpt-4o-mini` for resume extraction and candidate scoring, not `gpt-4o`.
 
**Why:** Resume extraction and candidate scoring are structured extraction tasks, not complex reasoning. `gpt-4o-mini` is ~20x cheaper and fast enough for real-time use. If quality proves insufficient for scoring rationale, upgrade to `gpt-4o` for the scoring chain only.
 
**Embedding model:** `text-embedding-3-small` (1536 dimensions). Cheaper than `text-embedding-3-large`, sufficient for resume/JD similarity at our scale.
 
---
 
## ADR-008: CQRS pattern in all services
 
**Decision:** Use `@nestjs/cqrs` with explicit Command and Query handlers in all microservices.
 
**Why:** CQRS makes the read/write separation explicit at the code level, not just the database level. Each handler is independently testable. As the codebase grows, it's clear where to add a new operation without touching existing service methods. The portfolio signal is also strong — CQRS demonstrates senior-level architectural thinking.
 
---
 
## ADR-009: TypeORM over Prisma
 
**Decision:** Use TypeORM with custom repositories, not Prisma.
 
**Why:** TypeORM integrates more naturally with NestJS's DI container and decorator-based style. The `@InjectRepository()` pattern is idiomatic NestJS. Prisma's generated client is powerful but adds a generation step and doesn't fit as cleanly with the CQRS repository pattern we're using. Consistency with TaxAI (which used Mongoose) and the broader pattern of using the NestJS-native ORM.
 
---
 
## ADR-010: No event sourcing
 
**Decision:** Do not implement event sourcing. Use `stage_history` table for audit trail instead.
 
**Why:** Event sourcing adds significant complexity (event store, projection rebuilding) that is not justified for a hiring pipeline. A `stage_history` table with `from_stage`, `to_stage`, `moved_at`, and `notes` gives us the full audit trail we need with straightforward SQL queries.
 