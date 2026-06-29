# Frontend — Smart Hiring Platform
 
## Stack
 
- Next.js 14 with App Router
- TypeScript (strict mode)
- TailwindCSS + shadcn/ui component library
- TanStack Query v5 for server state
- Zustand for client state (auth token, active tenant)
- React Hook Form + Zod for form validation
- Axios instance with JWT interceptor (`lib/api-client.ts`)
## Route structure
 
```
app/
  (auth)/
    login/
      page.tsx            # Login form
    register/
      page.tsx            # Register tenant + admin
 
  (dashboard)/
    layout.tsx            # Sidebar nav, auth guard, tenant context
    page.tsx              # Dashboard: open jobs count, recent activity
 
    jobs/
      page.tsx            # Job list
      new/
        page.tsx          # Create job form
      [jobId]/
        page.tsx          # Job overview + candidate stats
        candidates/
          page.tsx        # Candidate list with match scores
          upload/
            page.tsx      # Resume bulk upload
        pipeline/
          page.tsx        # Kanban pipeline board
        match/
          page.tsx        # Trigger match + view ranked results
 
    settings/
      page.tsx            # Tenant settings, user management
```
 
## Page descriptions
 
### `/login` and `/register`
- Simple centered card forms
- On success, store JWT in Zustand + localStorage
- Redirect to `/`
### `/` (dashboard)
- Stats cards: open jobs, candidates this week, interviews scheduled
- Recent activity feed (last 10 stage changes across all jobs)
### `/jobs`
- Table: job title, status, candidate count, created date
- "New job" button → modal or navigate to `/jobs/new`
- Row click → navigate to `/jobs/[jobId]`
### `/jobs/new`
- Form: title (text), description (textarea with character count)
- Submit → `POST /api/jobs`, redirect to `/jobs/[jobId]`
### `/jobs/[jobId]`
- Job title, status badge, edit button
- Tab bar: Candidates | Pipeline | Match Results
- Quick stats: total uploaded, parsed, matched, in pipeline
### `/jobs/[jobId]/candidates`
- Table: name, email, experience, skills (from `parsed_data`), match score (badge), current stage
- "Upload resumes" button → navigates to `/jobs/[jobId]/candidates/upload`
- "Run AI match" button → calls `POST /api/jobs/:id/match`, shows loading state
- Row click → candidate detail slide-over panel
### `/jobs/[jobId]/candidates/upload`
- Drag-and-drop file zone (react-dropzone)
- Accept: `application/pdf`, max 5MB per file, max 20 files at once
- Shows upload progress per file
- On success, shows queued status and polling until all `parse_status === 'done'`
### `/jobs/[jobId]/pipeline`
- Kanban board: 6 columns (applied, screening, interview, offer, hired, rejected)
- Each card: candidate name, match score badge, experience years
- Drag card between columns → `PATCH /api/pipeline/:candidateId/stage`
- Click card → slide-over with full candidate detail + stage history
### `/jobs/[jobId]/match`
- Ranked list of candidates with score (0–100), score bar, and LLM rationale
- Filter by minimum score slider
- "Move to screening" action per candidate
## Shared components
 
```
components/
  layout/
    Sidebar.tsx           # Nav links, user avatar, logout
    TopBar.tsx            # Breadcrumb, page title
  candidates/
    CandidateCard.tsx     # Used in pipeline kanban
    CandidateTable.tsx    # Used in candidates list page
    CandidateSlideOver.tsx # Full detail panel (name, parsed data, history, score)
  jobs/
    JobStatusBadge.tsx    # 'open' | 'closed' | 'draft' pill
    MatchScoreBadge.tsx   # Colored score: green ≥70, amber 40-69, red <40
  upload/
    ResumeDropzone.tsx    # Drag-and-drop PDF upload zone
  pipeline/
    PipelineBoard.tsx     # Kanban wrapper
    PipelineColumn.tsx    # Single stage column
  ui/                     # Re-exported shadcn/ui components
```
 
## Data fetching patterns
 
Use TanStack Query throughout. Never fetch in `useEffect`.
 
```typescript
// Example: candidates list with polling for parse status
const { data, isLoading } = useQuery({
  queryKey: ['candidates', jobId],
  queryFn: () => apiClient.get(`/jobs/${jobId}/candidates`).then(r => r.data),
  refetchInterval: (data) =>
    data?.data.some(c => c.parseStatus === 'processing') ? 3000 : false,
})
```
 
Server Components for static/SEO pages (login, register). Client Components for all dashboard pages (they need auth state and interactivity).
 
## API client
 
```typescript
// lib/api-client.ts
import axios from 'axios'
import { useAuthStore } from '@/store/auth'
 
const apiClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL + '/api' })
 
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
 
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)
 
export default apiClient
```
 
## Auth store (Zustand)
 
```typescript
// store/auth.ts
interface AuthState {
  token: string | null
  user: { id: string; email: string; role: string } | null
  setAuth: (token: string, user: AuthState['user']) => void
  logout: () => void
}
```
 
Persist to `localStorage` with Zustand `persist` middleware.
 
## Forms
 
All forms use React Hook Form + Zod resolver. Validation schemas live in `lib/schemas/` and are shared with the backend DTOs (via `libs/shared/dto/`).
 
## Environment variables (frontend)
 
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```
 
## Key UX decisions
 
- Match scores displayed as colored badges: green (≥70), amber (40–69), red (<40)
- Resume upload is always async — show "processing" state immediately, poll until done
- Pipeline stage moves are optimistic updates — revert on API error
- All destructive actions (delete job, reject candidate) require a confirmation dialog
- Empty states are actionable — "No candidates yet. Upload resumes →"