# API Reference — Smart Hiring Platform
 
## Base URL
 
`http://localhost:3000/api` (development)
 
All endpoints require `Authorization: Bearer <jwt>` unless marked **public**.
 
JWT payload shape:
```json
{ "sub": "user-uuid", "tenantId": "tenant-uuid", "role": "recruiter", "iat": 0, "exp": 0 }
```
 
## Auth endpoints
 
### POST /api/auth/register — **public**
Create a new tenant + admin user.
```json
// Request
{ "tenantName": "Acme Corp", "email": "admin@acme.com", "password": "min8chars" }
 
// Response 201
{ "tenantId": "uuid", "userId": "uuid", "accessToken": "jwt" }
```
 
### POST /api/auth/login — **public**
```json
// Request
{ "email": "admin@acme.com", "password": "..." }
 
// Response 200
{ "accessToken": "jwt", "user": { "id": "uuid", "email": "...", "role": "recruiter" } }
```
 
## Jobs endpoints
 
### GET /api/jobs
List all open jobs for the tenant.
```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "title": "Senior Backend Engineer",
      "description": "...",
      "status": "open",
      "candidateCount": 12,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```
 
### POST /api/jobs
Create a job. Triggers JD embedding in Matching Service (async).
```json
// Request
{ "title": "Senior Backend Engineer", "description": "We are looking for..." }
 
// Response 201
{ "id": "uuid", "title": "...", "status": "open", "embeddingStatus": "processing" }
```
 
### GET /api/jobs/:id
Single job with pipeline summary counts by stage.
 
### PATCH /api/jobs/:id
Update title, description, or status.
 
### DELETE /api/jobs/:id
Soft-delete (sets status to `closed`).
 
### POST /api/jobs/:id/match
Trigger AI matching for all parsed candidates against this job.
```json
// Response 200
{
  "jobId": "uuid",
  "matchedCount": 15,
  "topCandidates": [
    { "candidateId": "uuid", "name": "Arun Kumar", "score": 87, "rationale": "Strong Node.js..." }
  ]
}
```
 
## Candidates endpoints
 
### POST /api/jobs/:jobId/candidates/upload
Multipart upload — one or more PDF files.
```
Content-Type: multipart/form-data
Field: files (array of PDF)
```
```json
// Response 202
{
  "queued": [
    { "candidateId": "uuid", "filename": "arun_resume.pdf", "status": "processing" }
  ]
}
```
Returns immediately. Parsing is async — poll `GET /api/candidates/:id` for parse status.
 
### GET /api/jobs/:jobId/candidates
List candidates for a job with their match score and current pipeline stage.
```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Arun Kumar",
      "email": "arun@email.com",
      "parseStatus": "done",
      "matchScore": 87,
      "stage": "screening",
      "skills": ["Node.js", "TypeScript"],
      "experienceYears": 2.5
    }
  ]
}
```
 
### GET /api/candidates/:id
Single candidate — full parsed data, match details, stage history.
 
### DELETE /api/candidates/:id
Remove candidate from a job.
 
## Pipeline endpoints
 
### GET /api/jobs/:jobId/pipeline
Full pipeline board — candidates grouped by stage.
```json
// Response 200
{
  "stages": {
    "applied":    [{ "candidateId": "uuid", "name": "...", "matchScore": 82 }],
    "screening":  [...],
    "interview":  [...],
    "offer":      [...],
    "hired":      [...],
    "rejected":   [...]
  }
}
```
 
### PATCH /api/pipeline/:candidateId/stage
Move a candidate to the next stage.
```json
// Request
{ "jobId": "uuid", "toStage": "interview", "notes": "Strong technical round" }
 
// Response 200
{ "candidateId": "uuid", "fromStage": "screening", "toStage": "interview", "movedAt": "..." }
```
Triggers notification email to candidate (async via BullMQ).
 
### GET /api/pipeline/:candidateId/history
Stage change history for a candidate.
 
## Users endpoints (admin only)
 
### GET /api/users
List users in the tenant.
 
### POST /api/users
Invite a new user (role: recruiter or manager).
 
### PATCH /api/users/:id
Update role.
 
### DELETE /api/users/:id
Deactivate user.
 
## TCP message patterns (internal — microservices only)
 
API Gateway communicates with microservices using NestJS `ClientProxy.send()`. Pattern:
 
```typescript
// API Gateway → Resume Service
this.resumeClient.send('resume.upload', {
  tenantId: string,
  jobId: string,
  r2Key: string,
  originalFilename: string,
  uploadedBy: string,
})
 
// API Gateway → Matching Service
this.matchingClient.send('job.match', {
  tenantId: string,
  jobId: string,
})
 
// API Gateway → Matching Service (embed JD on create)
this.matchingClient.send('job.embed', {
  tenantId: string,
  jobId: string,
  description: string,
})
 
// API Gateway → Pipeline Service
this.pipelineClient.send('pipeline.move', {
  tenantId: string,
  jobId: string,
  candidateId: string,
  toStage: string,
  notes: string,
  movedBy: string,
})
 
// API Gateway → Pipeline Service
this.pipelineClient.send('pipeline.board', {
  tenantId: string,
  jobId: string,
})
```
 
All TCP handlers return:
```typescript
{ data: T | null, error: string | null }
```
 
## BullMQ queue message shapes
 
### Queue: `resume-parse`
```typescript
{
  tenantId: string,
  jobId: string,
  candidateId: string,   // pre-created with status='pending'
  r2Key: string,
  attempt: number,
}
```
 
### Queue: `notifications`
```typescript
{
  tenantId: string,
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  toStage: string,
  fromStage: string,
}
```
 
## Error response format
 
All errors follow this shape:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "description is required",
  "timestamp": "2025-01-01T00:00:00Z",
  "path": "/api/jobs"
}
```
 
HTTP status code usage:
- `400` — validation error (class-validator / Zod)
- `401` — missing or invalid JWT
- `403` — valid JWT but insufficient role
- `404` — resource not found in this tenant
- `409` — conflict (e.g. duplicate email)
- `422` — business rule violation (e.g. invalid stage transition)
- `500` — unhandled server error (never expose internal details)