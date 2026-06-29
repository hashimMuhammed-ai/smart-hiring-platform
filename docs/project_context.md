# Project Context — Smart Hiring Platform
 
## What this project is
 
Smart Hiring Platform is an AI-powered, multi-tenant recruitment SaaS. Recruiters upload job descriptions and candidate resumes; the system parses resumes using LangChain, embeds them into pgvector, and uses RAG-based matching to score candidates against job descriptions. A pipeline tracker manages candidates through hiring stages with async email notifications.
 
This is a portfolio project built to demonstrate senior-level backend and full-stack engineering skills: microservices architecture, LangChain RAG, PostgreSQL with pgvector, BullMQ async processing, and multi-tenant data isolation.
 
## Who uses it
 
- **Recruiters** — post jobs, upload resumes in bulk, view AI match scores, move candidates through pipeline stages
- **Hiring Managers** — view pipelines for their jobs, leave notes, approve/reject at offer stage
- **Admins** — manage tenant settings, users, and billing plan
## Monorepo structure
 
This project lives in a single Nx monorepo. All apps and shared libraries are co-located.
 
```
apps/
  api-gateway/          # NestJS — public-facing HTTP server, routes to microservices
  resume-service/       # NestJS microservice — PDF parsing, embedding
  matching-service/     # NestJS microservice — RAG scoring, pgvector search
  pipeline-service/     # NestJS microservice — hiring stage management
  notification-service/ # NestJS microservice — async email dispatch
  web/                  # Next.js 14 — recruiter/admin frontend
 
libs/
  shared/
    dto/                # Shared DTOs and Zod schemas used across services
    types/              # Shared TypeScript interfaces and enums
    constants/          # Queue names, stage enums, event names
    database/           # TypeORM entities, migrations, pgvector helpers
```
 
## Core user flows
 
1. Recruiter creates a job with a title and description → JD is embedded and stored
2. Recruiter uploads one or more resume PDFs for a job → queued for async parsing
3. System parses each resume, extracts structured data, generates embedding
4. Recruiter triggers "match" → RAG scoring runs, top candidates ranked with scores
5. Recruiter moves a candidate to the next pipeline stage → notification email sent
6. Recruiter or manager asks a natural-language question about candidates → AI agent answers
## Non-goals for v1
 
- No video interviews
- No calendar scheduling
- No mobile app
- No billing / payment integration (plan is hardcoded per tenant)
## Tech stack summary
 
See `architecture.md` for full detail.
 
- Backend: NestJS (microservices), TypeORM, PostgreSQL + pgvector, BullMQ, Redis, Cloudflare R2
- AI: LangChain.js, OpenAI (text-embedding-3-small, gpt-4o-mini)
- Frontend: Next.js 14 (App Router), TailwindCSS, shadcn/ui, TanStack Query
- Infra: Docker Compose (local), Railway or Render (deploy)
- Monorepo: Nx
## Environment variables (canonical list)
 
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/smart_hiring
 
# Redis
REDIS_URL=redis://localhost:6379
 
# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=smart-hiring-resumes
R2_PUBLIC_URL=
 
# OpenAI
OPENAI_API_KEY=
 
# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d
 
# Microservice ports (TCP)
RESUME_SERVICE_PORT=3001
MATCHING_SERVICE_PORT=3002
PIPELINE_SERVICE_PORT=3003
NOTIFICATION_SERVICE_PORT=3004
 
# Email (Nodemailer)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@smarthiring.dev
 
# App
NODE_ENV=development
API_GATEWAY_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```
 