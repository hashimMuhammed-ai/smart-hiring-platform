# Database — Smart Hiring Platform
 
## Engine
 
PostgreSQL 16 with the `pgvector` extension. ORM is TypeORM with synchronize disabled in production — all schema changes via migrations.
 
Enable pgvector on first connection:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
 
## Entities and schema
 
### tenants
 
```sql
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  plan        VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
 
### users
 
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'recruiter',  -- 'admin' | 'recruiter' | 'manager'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```
 
### jobs
 
```sql
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES users(id),
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  embedding   vector(1536),                          -- OpenAI text-embedding-3-small
  status      VARCHAR(50) NOT NULL DEFAULT 'open',  -- 'open' | 'closed' | 'draft'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);
```
 
### candidates
 
```sql
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name          VARCHAR(255),
  email         VARCHAR(255),
  phone         VARCHAR(50),
  resume_url    TEXT NOT NULL,                        -- Cloudflare R2 key
  parsed_data   JSONB,                               -- structured extraction from LangChain
  embedding     vector(1536),                         -- resume embedding
  parse_status  VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'failed'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidates_tenant ON candidates(tenant_id);
CREATE INDEX idx_candidates_job ON candidates(job_id);
CREATE INDEX idx_candidates_embedding ON candidates USING hnsw (embedding vector_cosine_ops);
```
 
`parsed_data` JSONB shape (set by LangChain extraction):
```json
{
  "name": "Arun Kumar",
  "email": "arun@email.com",
  "phone": "+91 9876543210",
  "summary": "...",
  "skills": ["Node.js", "TypeScript", "PostgreSQL"],
  "experience": [
    { "company": "Infosys", "role": "SDE II", "years": 2.5, "description": "..." }
  ],
  "education": [
    { "institution": "NIT Calicut", "degree": "B.Tech CS", "year": 2021 }
  ],
  "total_experience_years": 2.5
}
```
 
### candidate_job_matches
 
```sql
CREATE TABLE candidate_job_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  score         SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  rationale     TEXT,                                -- LLM explanation of the score
  similarity    FLOAT,                               -- raw pgvector cosine similarity
  matched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
CREATE INDEX idx_matches_job ON candidate_job_matches(job_id, score DESC);
CREATE INDEX idx_matches_tenant ON candidate_job_matches(tenant_id);
```
 
### pipeline_stages
 
```sql
CREATE TABLE pipeline_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage         VARCHAR(50) NOT NULL DEFAULT 'applied',
  -- 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  notes         TEXT,
  moved_by      UUID REFERENCES users(id),
  moved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)                      -- one active stage per candidate per job
);
CREATE INDEX idx_pipeline_job ON pipeline_stages(job_id, stage);
CREATE INDEX idx_pipeline_candidate ON pipeline_stages(candidate_id);
```
 
### stage_history
 
```sql
CREATE TABLE stage_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id   UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  from_stage    VARCHAR(50),
  to_stage      VARCHAR(50) NOT NULL,
  notes         TEXT,
  moved_by      UUID REFERENCES users(id),
  moved_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
 
### email_logs
 
```sql
CREATE TABLE email_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  candidate_id  UUID REFERENCES candidates(id),
  template      VARCHAR(100) NOT NULL,
  recipient     VARCHAR(255) NOT NULL,
  status        VARCHAR(50) NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error         TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
 
## Key queries
 
### Top-ranked candidates for a job (used by Matching Service)
 
```sql
SELECT
  c.id,
  c.name,
  c.email,
  c.parsed_data,
  cjm.score,
  cjm.rationale,
  cjm.similarity,
  ps.stage
FROM candidate_job_matches cjm
JOIN candidates c ON c.id = cjm.candidate_id
LEFT JOIN pipeline_stages ps ON ps.candidate_id = c.id AND ps.job_id = cjm.job_id
WHERE cjm.job_id = $1
  AND cjm.tenant_id = $2
ORDER BY cjm.score DESC, cjm.similarity DESC
LIMIT 50;
```
 
### pgvector similarity search (used by Matching Service before scoring)
 
```sql
SELECT
  id,
  name,
  parsed_data,
  1 - (embedding <=> $1::vector) AS similarity
FROM candidates
WHERE tenant_id = $2
  AND job_id = $3
  AND parse_status = 'done'
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 20;
```
`$1` = job description embedding as a float array
 
### Full pipeline view for a job
 
```sql
SELECT
  ps.stage,
  ps.moved_at,
  ps.notes,
  c.id AS candidate_id,
  c.name,
  c.email,
  c.parsed_data->>'total_experience_years' AS experience_years,
  cjm.score AS match_score
FROM pipeline_stages ps
JOIN candidates c ON c.id = ps.candidate_id
LEFT JOIN candidate_job_matches cjm ON cjm.candidate_id = c.id AND cjm.job_id = ps.job_id
WHERE ps.job_id = $1
  AND ps.tenant_id = $2
ORDER BY ps.stage, cjm.score DESC NULLS LAST;
```
 
## TypeORM entity conventions
 
- All entities extend a `BaseEntity` class with `id: UUID`, `createdAt`, `updatedAt`
- Entities live in `libs/shared/database/entities/`
- Vector columns use TypeORM `@Column({ type: 'vector', length: 1536 })` — requires custom column type registration
- All foreign keys use `@ManyToOne` with explicit `@JoinColumn({ name: 'tenant_id' })`
- Never use `synchronize: true` in production — always run migrations
## Migration strategy
 
- Migrations stored in `libs/shared/database/migrations/`
- Run with `typeorm migration:run` as a pre-deploy step
- Each migration is a single, reversible change
- Naming convention: `YYYYMMDDHHMMSS_DescriptiveAction.ts` (e.g. `20250101120000_CreateCandidatesTable.ts`)
## pgvector index choice
 
Using HNSW indexes (not IVFFlat) because:
- No need to run `VACUUM ANALYZE` before indexing
- Better query performance for our candidate volume range (<1M rows)
- Slightly higher memory usage is acceptable for this project size