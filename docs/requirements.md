# Requirements — Smart Hiring Platform
 
## Functional requirements
 
### Auth and multi-tenancy
- FR-1: Any visitor can register a new tenant account with a company name, email, and password
- FR-2: Registered users can log in and receive a JWT valid for 7 days
- FR-3: An admin can invite additional users with roles: `recruiter` or `manager`
- FR-4: All data is fully isolated per tenant — no cross-tenant data leakage is permissible under any circumstance
### Jobs
- FR-5: A recruiter can create a job with a title and description
- FR-6: On job creation, the description is automatically embedded (async) for future matching
- FR-7: A recruiter can list, view, update, and soft-delete jobs
- FR-8: Job status transitions: `draft → open → closed`
### Resume ingestion
- FR-9: A recruiter can upload 1–20 PDF resumes at once for a given job
- FR-10: The system accepts resumes up to 5MB each
- FR-11: Resume parsing runs asynchronously — the upload response is immediate, not blocking
- FR-12: The system extracts: full name, email, phone, summary, skills list, work experience (company, role, years, description), education, and total years of experience
- FR-13: If parsing fails after 3 retries, the candidate is marked `parse_failed` and the recruiter can see this status
- FR-14: Parsed resume data is stored as structured JSON in the candidate record
### AI matching
- FR-15: A recruiter can trigger AI matching for all parsed candidates against a job
- FR-16: The system runs a pgvector similarity search to find the most semantically similar candidates for the job description
- FR-17: The top candidates are scored 0–100 by an LLM with a plain-English rationale for each score
- FR-18: Match scores are persisted and visible in the candidate list
- FR-19: Recruiter can re-run matching at any time (scores are upserted, not duplicated)
### Pipeline management
- FR-20: Each candidate-job pair has exactly one active pipeline stage
- FR-21: Valid stage order: `applied → screening → interview → offer → hired`; any stage can transition to `rejected`
- FR-22: Recruiters and managers can move candidates between stages with optional notes
- FR-23: Every stage change is recorded in a history log with timestamp, actor, and notes
- FR-24: A kanban board view shows all candidates grouped by their current stage
### Notifications
- FR-25: When a candidate is moved to `screening`, `interview`, `offer`, `hired`, or `rejected`, an email is sent to the candidate's email address
- FR-26: Email delivery is async and does not block the stage transition response
- FR-27: Email delivery success/failure is logged per attempt
## Non-functional requirements
 
### Performance
- NFR-1: Resume upload endpoint must respond within 500ms (before async parsing begins)
- NFR-2: AI matching for up to 50 candidates must complete within 30 seconds
- NFR-3: Pipeline board query must return within 500ms for up to 500 candidates per job
- NFR-4: pgvector similarity search must return within 200ms for up to 100k candidate rows
### Security
- NFR-5: All endpoints except `/api/auth/register` and `/api/auth/login` require a valid JWT
- NFR-6: `tenantId` is always extracted from the JWT — never from request body or query params
- NFR-7: Passwords are hashed with bcrypt (minimum 10 rounds)
- NFR-8: R2 file keys include `tenantId` as a prefix to prevent cross-tenant access patterns
- NFR-9: API Gateway applies rate limiting: 100 requests per minute per IP
### Reliability
- NFR-10: Resume parse jobs retry up to 3 times with exponential backoff before failing
- NFR-11: Failed BullMQ jobs are visible in Bull Board and can be retried manually
- NFR-12: Microservice TCP failures return structured error responses — they never crash the API Gateway
### Developer experience
- NFR-13: `docker compose up postgres redis` is the only prerequisite for local development
- NFR-14: All 6 apps start with a single `nx run-many --target=serve` command
- NFR-15: Migrations run automatically as a pre-start step in development
### Observability
- NFR-16: All services use Winston for structured JSON logging
- NFR-17: Every log entry includes: `service`, `tenantId` (where available), `traceId`, `level`, `message`, `timestamp`
- NFR-18: BullMQ job lifecycle (queued, started, completed, failed) is logged with job ID
## Out of scope for v1
 
- Video interviews
- Calendar / scheduling integration
- Billing and payment
- Mobile application
- Role-based field-level access control (all recruiters in a tenant see all data)
- Resume parsing for non-PDF formats (Word, plain text)
 