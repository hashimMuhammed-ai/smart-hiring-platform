---
trigger: always_on
---

# Smart Hiring Platform — workspace rules

## Context loading
Before generating any code, always read these files in order:
1. docs/project_context.md — what this project is, monorepo structure, env vars
2. docs/architecture.md — service responsibilities, communication patterns, data flows
3. docs/TechDecisions.md — why each technology was chosen; never suggest alternatives
4. docs/CodingStandards.md — file structure, naming, CQRS pattern, repository pattern

When working on database/SQL code, also read: docs/database.md
When working on API Gateway or endpoints, also read: docs/api.md
When working on the Next.js frontend, also read: docs/frontend.md

## Hard rules (always apply, no exceptions)
- This is an Nx monorepo with 5 NestJS microservices + 1 Next.js app
- Services communicate via NestJS TCP transport — never add HTTP calls between services
- Every database query must include tenantId scoping — see CodingStandards.md
- All write operations use CQRS (CommandBus/QueryBus) — never put logic directly in service methods
- All database access goes through a Repository class — never call TypeORM directly from a service
- TCP message handlers always return { data: T | null, error: string | null } — never throw across service boundaries
- No any in TypeScript — use unknown and narrow, or define a proper type

## How to implement features
When I ask you to implement a task, find it in docs/TaskList.md by its task ID (e.g. S2-T4).
Read the task description, file paths, and acceptance criteria before writing any code.
Generate all files the task specifies — don't stop at one file and ask what's next.